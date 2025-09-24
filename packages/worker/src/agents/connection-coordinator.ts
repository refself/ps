import { Agent, getAgentByName } from 'agents';
import { migrate } from 'drizzle-orm/durable-sqlite/migrator';
import {
  OSClientToolResponseSchema,
  type OSClientToolRequest,
  type OSClientToolResponse,
  type ExecuteScriptInput,
  type StartRecordingInput,
  type StopRecordingInput,
  type GetRecordingInput,
} from '@/schemas/osclient-tools';
import {
  ConnectionCoordinatorRepository,
  type ToolRequestRecord,
  type ToolRequestStatus,
} from '@/repositories/connection-coordinator-repository';
import coordinatorMigrations from '../../drizzle/connection-coordinator/migrations';

interface ConnectionInfo {
  id: string;
  type: 'web' | 'osclient';
  connectedAt: number;
  lastActivity: number;
}

interface CoordinatorState {
  connectedAt: number;
  lastActivity: number;
  connectionCount: number;
  webConnectionIds: string[];
  osConnectionIds: string[];
}

interface PendingRequestContext {
  workflowId: string;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  createdAt: number;
}

interface ToolRequestSnapshot {
  requestId: string;
  workflowId: string;
  tool: string;
  params: unknown;
  status: ToolRequestStatus;
  responseData?: unknown;
  error?: string | null;
  createdAt: number;
  resolvedAt?: number | null;
}

interface SendToolRequestInput {
  workflowId: string;
  tool: OSClientToolRequest['tool'];
  params: ExecuteScriptInput | StartRecordingInput | StopRecordingInput | GetRecordingInput;
}

interface ListToolRequestsInput {
  workflowId?: string;
  status?: ToolRequestStatus;
  limit?: number;
}

// WebSocket connection interface
interface Connection<State = unknown> {
  // Unique ID for this connection
  id: string;

  // Client-specific state attached to this connection
  state: State;

  // Update the connection's state
  setState(state: State): void;

  // Accept an incoming WebSocket connection
  accept(): void;

  // Close the WebSocket connection with optional code and reason
  close(code?: number, reason?: string): void;

  // Send a message to the client
  // Can be string, ArrayBuffer, or ArrayBufferView
  send(message: string | ArrayBuffer | ArrayBufferView): void;
}

type WSMessage = string | ArrayBuffer | ArrayBufferView;

interface ConnectionContext {
  request: Request;
}

const noop = () => {};

export class ConnectionCoordinator extends Agent<Env, CoordinatorState> {
  private connections = new Map<string, ConnectionInfo>(); // connectionId -> info
  private websocketConnections = new Map<string, any>(); // connectionId -> websocket
  private pendingToolRequests = new Map<string, PendingRequestContext>(); // requestId -> pending
  private pendingRequestRepo: ConnectionCoordinatorRepository;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.pendingRequestRepo = new ConnectionCoordinatorRepository(ctx.storage);

    ctx.blockConcurrencyWhile(async () => {
      try {
        migrate(this.pendingRequestRepo.getDb(), coordinatorMigrations);
        this.rehydratePendingRequests();
        if (this.connections.size === 0 && (this.state.osConnectionIds.length > 0 || this.state.webConnectionIds.length > 0)) {
          this.setState({
            ...this.state,
            connectionCount: 0,
            osConnectionIds: [],
            webConnectionIds: [],
          });
        }
      } catch (error) {
        console.error('Failed to initialize connection coordinator storage:', error);
        throw error;
      }
    });
  }

  initialState: CoordinatorState = {
    connectedAt: Date.now(),
    lastActivity: Date.now(),
    connectionCount: 0,
    webConnectionIds: [],
    osConnectionIds: [],
  };

  async onStart() {
    console.log('Connection Coordinator started');
  }

  // WebSocket connection handler with authentication
  async onConnect(connection: Connection, ctx: ConnectionContext) {
    try {

      // Determine client type from URL or query params
      const url = new URL(ctx.request.url);
      const clientType = url.searchParams.get('client') as 'web' | 'osclient' || 'web';

      // Store connection info
      const connectionInfo: ConnectionInfo = {
        id: connection.id,
        type: clientType,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
      };

      this.connections.set(connection.id, connectionInfo);
      this.websocketConnections.set(connection.id, connection);

      // Update state
      const webConnectionIds = [...this.state.webConnectionIds];
      const osConnectionIds = [...this.state.osConnectionIds];

      if (clientType === 'web') {
        webConnectionIds.push(connection.id);
      } else {
        osConnectionIds.push(connection.id);
      }

      this.setState({
        ...this.state,
        lastActivity: Date.now(),
        connectionCount: this.connections.size,
        webConnectionIds,
        osConnectionIds,
      });

      // Send welcome message
      connection.send(JSON.stringify({
        type: 'connected',
        clientId: connection.id,
        clientType,
        capabilities: clientType === 'osclient' ? [
          'execute_script',
          'start_recording',
          'stop_recording',
          'get_recording'
        ] : ['workflow_updates', 'real_time_sync']
      }));

      console.log(`${clientType} client connected: ${connection.id}`);
    } catch (error) {
      console.error('Authentication failed:', error);
      connection.close(1008, 'Authentication failed');
    }
  }

  async onMessage(connection: any, message: any) {
    const connectionInfo = this.connections.get(connection.id);
    if (!connectionInfo) {
      connection.close(1011, 'Connection not found');
      return;
    }

    try {
      const data = JSON.parse(message);

      // Update last activity
      connectionInfo.lastActivity = Date.now();
      this.setState({
        ...this.state,
        lastActivity: Date.now(),
      });

      if (connectionInfo.type === 'osclient') {
        await this.handleOSClientMessage(connection, data, connectionInfo);
      } else {
        await this.handleWebClientMessage(connection, data, connectionInfo);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
      connection.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  }

  async onClose(connection: any, code: number, reason: string) {
    const connectionInfo = this.connections.get(connection.id);
    if (connectionInfo) {
      console.log(`${connectionInfo.type} client disconnected: ${connection.id}`);

      // Update state
      const webConnectionIds = this.state.webConnectionIds.filter(id => id !== connection.id);
      const osConnectionIds = this.state.osConnectionIds.filter(id => id !== connection.id);
      const remainingConnections = this.connections.size - 1;

      this.setState({
        ...this.state,
        connectionCount: remainingConnections,
        webConnectionIds,
        osConnectionIds,
      });
    }

    this.connections.delete(connection.id);
    this.websocketConnections.delete(connection.id);
  }

  async onError(error: unknown): Promise<void>;
  async onError(connection: any, error: unknown): Promise<void>;
  async onError(connectionOrError: any, error?: unknown): Promise<void> {
    if (error !== undefined) {
      const connectionInfo = this.connections.get(connectionOrError.id);
      console.error(`${connectionInfo?.type || 'unknown'} client error: ${connectionOrError.id}`, error);
    } else {
      console.error('Connection Coordinator error:', connectionOrError);
    }
  }

  // Handle OS client messages
  private async handleOSClientMessage(connection: any, data: any, connectionInfo: ConnectionInfo) {
    if (data.type === 'tool_response') {
      const response = OSClientToolResponseSchema.parse(data);
      this.handleToolResponse(response);
      return;
    }

    if (data.type === 'ping') {
      connection.send(JSON.stringify({ type: 'pong' }));
      return;
    }

    console.log('Received message from OS client:', data);
  }

  // Handle web client messages
  private async handleWebClientMessage(connection: any, data: any, connectionInfo: ConnectionInfo) {
    if (data.type === 'ping') {
      connection.send(JSON.stringify({ type: 'pong' }));
      return;
    }

    // Route workflow-specific messages to the appropriate workflow agent
    if (data.workflowId) {
      try {
        const workflowAgent = await getAgentByName(this.env.WORKFLOW_RUNNER, data.workflowId);

        // Handle different web client message types
        if (data.type === 'get_workflow_state') {
          const detail = await (workflowAgent as any).getDetail();
          connection.send(JSON.stringify({
            type: 'workflow_state',
            workflowId: data.workflowId,
            state: detail,
          }));
        }

        // Add more message handlers as needed...
      } catch (error) {
        connection.send(JSON.stringify({
          type: 'error',
          message: 'Failed to communicate with workflow'
        }));
      }
    }

    console.log('Received message from web client:', data);
  }

  // Public methods for tool execution (called by workflow agents via RPC)
  async executeScriptForWorkflow(workflowId: string, params: ExecuteScriptInput): Promise<any> {
    return this.sendToolRequestToOSClient({
      workflowId,
      tool: 'execute_script',
      params,
    });
  }

  async startRecordingForWorkflow(workflowId: string, params: StartRecordingInput = {}): Promise<{ recordingId: string }> {
    return this.sendToolRequestToOSClient({
      workflowId,
      tool: 'start_recording',
      params,
    });
  }

  async stopRecordingForWorkflow(workflowId: string, params: StopRecordingInput): Promise<any> {
    return this.sendToolRequestToOSClient({
      workflowId,
      tool: 'stop_recording',
      params,
    });
  }

  async getRecordingForWorkflow(workflowId: string, params: GetRecordingInput): Promise<any> {
    return this.sendToolRequestToOSClient({
      workflowId,
      tool: 'get_recording',
      params,
    });
  }

  // Check if user has OS client connected
  isOSClientConnectedForUser(_userId: string): boolean {
    return Array.from(this.connections.values()).some(conn => conn.type === 'osclient');
  }

  // Get connection status for a user
  getConnectionStatusForUser(_userId: string) {
    const allConnections = Array.from(this.connections.values());
    const hasOSClient = allConnections.some(conn => conn.type === 'osclient');
    const hasWebClient = allConnections.some(conn => conn.type === 'web');

    return {
      hasOSClient,
      hasWebClient,
      connectionCount: allConnections.length,
      connections: allConnections.map(conn => ({
        id: conn.id,
        type: conn.type,
        connectedAt: conn.connectedAt,
      })),
    };
  }

  listToolRequests(input: ListToolRequestsInput = {}): ToolRequestSnapshot[] {
    const records = this.pendingRequestRepo.listRequests(input);
    return records.map(record => this.toToolRequestSnapshot(record));
  }

  // Private helper methods
  private rehydratePendingRequests(): void {
    const pendingRecords = this.pendingRequestRepo.listPendingRequests();
    if (pendingRecords.length === 0) {
      return;
    }

    pendingRecords.forEach(record => {
      if (this.pendingToolRequests.has(record.requestId)) {
        return;
      }

      this.pendingToolRequests.set(record.requestId, {
        workflowId: record.workflowId,
        resolve: noop,
        reject: noop,
        createdAt: record.createdAt,
      });
    });

    console.log(`Rehydrated ${pendingRecords.length} pending tool requests`);
  }

  private safeSerialize(value: unknown): string | null {
    if (value === undefined) {
      return null;
    }

    try {
      return JSON.stringify(value);
    } catch (error) {
      console.warn('Failed to serialize tool response', error);
      return null;
    }
  }

  private safeParse(value: string | null | undefined): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (_error) {
      return value;
    }
  }

  private toToolRequestSnapshot(record: ToolRequestRecord): ToolRequestSnapshot {
    const responseData = record.responseData === null || record.responseData === undefined
      ? undefined
      : this.safeParse(record.responseData);

    const resolvedAt = record.resolvedAt === null || record.resolvedAt === undefined
      ? undefined
      : record.resolvedAt;

    return {
      requestId: record.requestId,
      workflowId: record.workflowId,
      tool: record.tool,
      params: this.safeParse(record.params),
      status: record.status,
      responseData,
      error: record.error ?? undefined,
      createdAt: record.createdAt,
      resolvedAt,
    };
  }

  private async sendToolRequestToOSClient({ workflowId, tool, params }: SendToolRequestInput): Promise<any> {
    const osClientConnections = Array.from(this.connections.values())
      .filter(conn => conn.type === 'osclient');

    const osClientConnection = osClientConnections[0];

    if (!osClientConnection) {
      throw new Error('No OS client connected');
    }

    const connection = this.websocketConnections.get(osClientConnection.id);
    if (!connection) {
      throw new Error('OS client connection lost');
    }

    const requestId = crypto.randomUUID();

    let request: OSClientToolRequest;

    switch (tool) {
      case 'execute_script':
        request = { tool, requestId, params: params as ExecuteScriptInput };
        break;
      case 'start_recording':
        request = { tool, requestId, params: params as StartRecordingInput };
        break;
      case 'stop_recording':
        request = { tool, requestId, params: params as StopRecordingInput };
        break;
      case 'get_recording':
        request = { tool, requestId, params: params as GetRecordingInput };
        break;
      default: {
        const exhaustiveCheck: never = tool;
        throw new Error(`Unsupported tool request: ${exhaustiveCheck}`);
      }
    }

    const createdAt = Date.now();

    let serializedParams: string;
    try {
      serializedParams = JSON.stringify(params);
    } catch (error) {
      throw new Error('Failed to serialize tool request parameters');
    }

    this.pendingRequestRepo.createRequest({
      requestId,
      workflowId,
      tool,
      params: serializedParams,
      createdAt,
    });

    const promise = new Promise((resolve, reject) => {
      this.pendingToolRequests.set(requestId, {
        workflowId,
        resolve,
        reject,
        createdAt,
      });
    });

    try {
      connection.send(JSON.stringify({
        ...request,
        workflowId,
      }));
    } catch (error) {
      this.pendingToolRequests.delete(requestId);
      this.pendingRequestRepo.markError({
        requestId,
        error: error instanceof Error ? error.message : 'Failed to send tool request',
        resolvedAt: Date.now(),
      });
      throw error;
    }

    return promise;
  }

  private handleToolResponse(response: OSClientToolResponse): void {
    const resolvedAt = Date.now();
    const pendingRequest = this.pendingToolRequests.get(response.requestId);
    if (pendingRequest) {
      this.pendingToolRequests.delete(response.requestId);
    }

    if (response.success) {
      const serialized = this.safeSerialize(response.data);
      this.pendingRequestRepo.markSuccess({
        requestId: response.requestId,
        responseData: serialized,
        resolvedAt,
      });

      if (pendingRequest) {
        pendingRequest.resolve(response.data);
      }
    } else {
      this.pendingRequestRepo.markError({
        requestId: response.requestId,
        error: response.error ?? 'Tool execution failed',
        resolvedAt,
      });

      if (pendingRequest) {
        pendingRequest.reject(new Error(response.error || 'Tool execution failed'));
      }
    }

    if (!pendingRequest) {
      console.log('Stored tool response for request without active listener:', response.requestId);
    }
  }

  // Broadcast message to all web clients
  broadcastToUserWebClients(_userId: string, message: any): void {
    this.state.webConnectionIds.forEach(id => {
      const connection = this.websocketConnections.get(id);
      if (connection) {
        connection.send(JSON.stringify(message));
      }
    });
  }

  // Agent lifecycle hooks
  onStateUpdate(state: CoordinatorState, source: "server" | any) {
    console.log('Connection Coordinator state updated:', {
      connectionCount: state.connectionCount,
      webConnections: state.webConnectionIds.length,
      osConnections: state.osConnectionIds.length,
      lastActivity: new Date(state.lastActivity).toISOString(),
      source: source === "server" ? "server" : "client"
    });
  }
}
