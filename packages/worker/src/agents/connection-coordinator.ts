import { Agent, getAgentByName } from 'agents';
import { z } from 'zod';
import { migrate } from 'drizzle-orm/durable-sqlite/migrator';
import {
  OSClientToolResponseSchema,
  StartRecordingSchema,
  StopRecordingSchema,
  GetRecordingSchema,
  AbortScriptSchema,
  type OSClientToolRequest,
  type OSClientToolResponse,
  type ExecuteScriptInput,
  type StartRecordingInput,
  type StopRecordingInput,
  type GetRecordingInput,
  type AbortScriptInput,
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
  connectionId?: string;
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
  params: ExecuteScriptInput | StartRecordingInput | StopRecordingInput | GetRecordingInput | AbortScriptInput;
}

interface ListToolRequestsInput {
  workflowId?: string;
  status?: ToolRequestStatus;
  limit?: number;
}

const DEFAULT_USER_ID = 'aceca593-9511-4621-a567-449207737244';

const ExecuteScriptWebParamsSchema = z.object({
  enable_narration: z.boolean().optional(),
  trace: z.boolean().optional(),
  variables: z.record(z.string(), z.unknown()).optional(),
});

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

      // Get current connection status to include in welcome message
      const allConnections = Array.from(this.connections.values());
      const hasOSClient = allConnections.some(conn => conn.type === 'osclient');
      const hasWebClient = allConnections.some(conn => conn.type === 'web');

      console.log(`Welcome message for ${clientType} client:`, {
        connectionId: connection.id,
        totalConnections: allConnections.length,
        connectionTypes: allConnections.map(c => c.type),
        hasOSClient,
        hasWebClient
      });

      // Send welcome message with connection status
      connection.send(JSON.stringify({
        type: 'connected',
        data: {
          coordinatorId: this.name,
          clientId: connection.id,
          clientType,
          hasOSClient,
          hasWebClient,
          capabilities: clientType === 'osclient' ? [
            'execute_script',
            'start_recording',
            'stop_recording',
            'get_recording',
            'abort_script'
          ] : ['workflow_updates', 'real_time_sync']
        }
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

      if (connectionInfo.type === 'osclient') {
        this.failPendingRequestsForConnection({
          connectionId: connection.id,
          closeCode: code,
          closeReason: reason,
        });
      }
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

    if (data.type === 'tool_request') {
      await this.handleWebClientToolRequest(connection, data);
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
        connectionId: undefined,
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
      case 'abort_script':
        request = { tool, requestId, params: params as AbortScriptInput };
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
        connectionId: osClientConnection.id,
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
      let derivedError: string | undefined;
      if (response.error) {
        derivedError = response.error;
      } else if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        const maybeError = (response.data as { error?: unknown }).error;
        if (typeof maybeError === 'string' && maybeError.trim().length > 0) {
          derivedError = maybeError;
        }
      }

      this.pendingRequestRepo.markError({
        requestId: response.requestId,
        error: derivedError ?? 'Tool execution failed',
        resolvedAt,
      });

      if (pendingRequest) {
        const errorObject = new Error(derivedError || 'Tool execution failed');
        (errorObject as Error & { data?: unknown }).data = response.data;
        pendingRequest.reject(errorObject);
      }
    }

    if (!pendingRequest) {
      console.log('Stored tool response for request without active listener:', response.requestId);
    }
  }

  private async handleWebClientToolRequest(connection: any, data: any) {
    const { requestId, workflowId, tool, params } = data ?? {};

    if (!workflowId || typeof workflowId !== 'string') {
      connection.send(JSON.stringify({
        type: 'tool_response',
        requestId,
        success: false,
        data: { error: 'workflowId is required for tool requests' },
      }));
      return;
    }

    if (!tool || typeof tool !== 'string') {
      connection.send(JSON.stringify({
        type: 'tool_response',
        requestId,
        success: false,
        data: { error: 'Tool is required for tool requests' },
      }));
      return;
    }

    try {
      const workflowAgent = await getAgentByName(this.env.WORKFLOW_RUNNER, workflowId);
      let result: unknown;

      switch (tool) {
        case 'execute_script': {
          const parsed = ExecuteScriptWebParamsSchema.parse(params ?? {});
          result = await (workflowAgent as any).executeScript(DEFAULT_USER_ID, parsed);
          break;
        }
        case 'start_recording': {
          const parsed = StartRecordingSchema.parse(params ?? {});
          result = await (workflowAgent as any).startRecording(DEFAULT_USER_ID, parsed);
          break;
        }
        case 'stop_recording': {
          const parsed = StopRecordingSchema.parse(params ?? {});
          result = await (workflowAgent as any).stopRecording(DEFAULT_USER_ID, parsed);
          break;
        }
        case 'get_recording': {
          const parsed = GetRecordingSchema.parse(params ?? {});
          result = await (workflowAgent as any).getRecording(DEFAULT_USER_ID, parsed);
          break;
        }
        case 'abort_script': {
          const parsed = AbortScriptSchema.parse(params ?? {});
          result = await this.sendToolRequestToOSClient({
            workflowId,
            tool: 'abort_script',
            params: parsed,
          });
          break;
        }
        default:
          throw new Error(`Unsupported tool request: ${tool}`);
      }

      connection.send(JSON.stringify({
        type: 'tool_response',
        requestId,
        success: true,
        data: result,
      }));
    } catch (error) {
      let errorMessage = 'Tool request failed';
      let dataPayload: Record<string, unknown> | undefined;

      if (error instanceof Error) {
        if (error.message.trim().length > 0) {
          errorMessage = error.message;
        }

        const extra = (error as Error & { data?: unknown }).data;
        if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
          dataPayload = extra as Record<string, unknown>;
          const nestedError = dataPayload?.error;
          if (typeof nestedError === 'string' && nestedError.trim().length > 0) {
            errorMessage = nestedError;
          }
        }
      }

      const responsePayload: Record<string, unknown> = {
        type: 'tool_response',
        requestId,
        success: false,
        error: errorMessage,
      };

      if (dataPayload) {
        responsePayload.data = dataPayload;
      } else {
        responsePayload.data = { error: errorMessage };
      }

      connection.send(JSON.stringify(responsePayload));
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

  private failPendingRequestsForConnection({
    connectionId,
    closeCode,
    closeReason,
  }: {
    connectionId: string;
    closeCode: number;
    closeReason: string;
  }) {
    const failures: string[] = [];
    const reason = closeReason?.trim()
      ? `OS client disconnected (${closeCode}): ${closeReason}`
      : `OS client disconnected (${closeCode})`;

    this.pendingToolRequests.forEach((pending, requestId) => {
      if (pending.connectionId !== connectionId) {
        return;
      }

      this.pendingToolRequests.delete(requestId);

      try {
        pending.reject(new Error(reason));
      } catch (error) {
        console.error('Failed to reject pending tool request', { requestId, error });
      }

      this.pendingRequestRepo.markError({
        requestId,
        error: reason,
        resolvedAt: Date.now(),
      });

      failures.push(requestId);
    });

    if (failures.length === 0) {
      return;
    }

    console.warn(`Rejected ${failures.length} pending tool request(s) after OS client disconnect:`, failures);
  }
}
