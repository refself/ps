import { Agent, getAgentByName } from 'agents';
import { extractUserIdFromRequest } from '@/utils/auth';
import {
  OSClientToolResponseSchema,
  type OSClientToolRequest,
  type OSClientToolResponse,
  type ExecuteScriptInput,
  type StartRecordingInput,
  type StopRecordingInput,
  type GetRecordingInput,
} from '@/schemas/osclient-tools';

interface ConnectionInfo {
  id: string;
  type: 'web' | 'osclient';
  userId: string;
  workflowId?: string;
  connectedAt: number;
  lastActivity: number;
}

interface CoordinatorState {
  connectedAt: number;
  lastActivity: number;
  connectionCount: number;
  userId?: string;
  webConnectionIds: string[];
  osConnectionIds: string[];
}

interface PendingRequest {
  workflowId: string;
  userId: string;
  resolve: Function;
  reject: Function;
  timestamp: number;
}

interface SendToolRequestInput {
  workflowId: string;
  tool: OSClientToolRequest['tool'];
  params: ExecuteScriptInput | StartRecordingInput | StopRecordingInput | GetRecordingInput;
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

export class ConnectionCoordinator extends Agent<Env, CoordinatorState> {
  private connections = new Map<string, ConnectionInfo>(); // connectionId -> info
  private websocketConnections = new Map<string, any>(); // connectionId -> websocket
  private pendingToolRequests = new Map<string, PendingRequest>(); // requestId -> pending

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
      // Extract and verify JWT token
      const jwtSecret = await this.env.JWT_SECRET.get();
      const userId = await extractUserIdFromRequest(ctx.request, jwtSecret);

      if (this.state.userId && this.state.userId !== userId) {
        console.warn(`Rejected connection ${connection.id} for mismatched user ${userId}`);
        connection.close(1008, 'Invalid user context');
        return;
      }

      const coordinatorUserId = this.state.userId ?? userId;

      // Determine client type from URL or query params
      const url = new URL(ctx.request.url);
      const clientType = url.searchParams.get('client') as 'web' | 'osclient' || 'web';
      const workflowId = url.searchParams.get('workflowId') || undefined;

      // Store connection info
      const connectionInfo: ConnectionInfo = {
        id: connection.id,
        type: clientType,
        userId: coordinatorUserId,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        workflowId,
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
        userId: coordinatorUserId,
        webConnectionIds,
        osConnectionIds,
      });

      // Send welcome message
      connection.send(JSON.stringify({
        type: 'connected',
        clientId: connection.id,
        clientType,
        userId: coordinatorUserId,
        workflowId,
        capabilities: clientType === 'osclient' ? [
          'execute_script',
          'start_recording',
          'stop_recording',
          'get_recording'
        ] : ['workflow_updates', 'real_time_sync']
      }));
      console.log(`${clientType} client connected for user ${coordinatorUserId}: ${connection.id}`);
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

      const coordinatorUserId = this.state.userId ?? connectionInfo.userId;

      this.setState({
        ...this.state,
        connectionCount: remainingConnections,
        webConnectionIds,
        osConnectionIds,
        userId: remainingConnections > 0 ? coordinatorUserId : undefined,
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
    if (data.workflowId && connectionInfo.userId) {
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
  isOSClientConnectedForUser(userId: string): boolean {
    if (this.state.userId && this.state.userId !== userId) {
      return false;
    }

    return this.state.osConnectionIds.length > 0;
  }

  // Get connection status for a user
  getConnectionStatusForUser(userId: string) {
    if (this.state.userId && this.state.userId !== userId) {
      return {
        hasOSClient: false,
        hasWebClient: false,
        connectionCount: 0,
        connections: [],
      };
    }

    const userConnections = Array.from(this.connections.values())
      .filter(conn => conn.userId === userId);

    return {
      hasOSClient: this.state.osConnectionIds.length > 0,
      hasWebClient: this.state.webConnectionIds.length > 0,
      connectionCount: userConnections.length,
      connections: userConnections.map(conn => ({
        id: conn.id,
        type: conn.type,
        workflowId: conn.workflowId,
        connectedAt: conn.connectedAt,
      })),
    };
  }

  // Private helper methods
  private async sendToolRequestToOSClient({ workflowId, tool, params }: SendToolRequestInput): Promise<any> {
    const coordinatorUserId = this.state.userId;
    if (!coordinatorUserId) {
      throw new Error('Coordinator is not associated with a user');
    }

    const osClientConnections = Array.from(this.connections.values())
      .filter(conn => conn.type === 'osclient' && conn.userId === coordinatorUserId);

    const osClientConnection = osClientConnections.find(conn => conn.workflowId === workflowId)
      ?? osClientConnections[0];

    if (!osClientConnection) {
      throw new Error(`No OS client connected for user ${coordinatorUserId}`);
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

    const promise = new Promise((resolve, reject) => {
      this.pendingToolRequests.set(requestId, {
        workflowId,
        userId: coordinatorUserId,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      setTimeout(() => {
        if (this.pendingToolRequests.has(requestId)) {
          this.pendingToolRequests.delete(requestId);
          reject(new Error(`Tool request timeout for workflow ${workflowId} (user: ${coordinatorUserId})`));
        }
      }, 30000);
    });

    connection.send(JSON.stringify({
      ...request,
      workflowId,
      userId: coordinatorUserId,
    }));

    return promise;
  }

  private handleToolResponse(response: OSClientToolResponse): void {
    const pendingRequest = this.pendingToolRequests.get(response.requestId);
    if (!pendingRequest) {
      console.warn('Received response for unknown request:', response.requestId);
      return;
    }

    this.pendingToolRequests.delete(response.requestId);

    if (response.success) {
      pendingRequest.resolve(response.data);
    } else {
      pendingRequest.reject(new Error(response.error || 'Tool execution failed'));
    }
  }

  // Broadcast message to all web clients for a specific user
  broadcastToUserWebClients(userId: string, message: any): void {
    if (this.state.userId && this.state.userId !== userId) {
      return;
    }

    Array.from(this.connections.values())
      .filter(conn => conn.userId === userId && conn.type === 'web')
      .forEach(conn => {
        const connection = this.websocketConnections.get(conn.id);
        if (connection) {
          connection.send(JSON.stringify(message));
        }
      });
  }

  // Agent lifecycle hooks
  onStateUpdate(state: CoordinatorState, source: "server" | any) {
    console.log('Connection Coordinator state updated:', {
      connectionCount: state.connectionCount,
      userId: state.userId,
      webConnections: state.webConnectionIds.length,
      osConnections: state.osConnectionIds.length,
      lastActivity: new Date(state.lastActivity).toISOString(),
      source: source === "server" ? "server" : "client"
    });
  }
}
