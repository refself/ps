import { nanoid } from 'nanoid';

export type WebSocketMessage =
  | { type: 'connected'; data: { coordinatorId: string; clientId?: string; clientType?: string; hasOSClient?: boolean; hasWebClient?: boolean } }
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'tool_request'; requestId: string; tool: string; workflowId?: string; params: Record<string, unknown> }
  | { type: 'tool_response'; requestId: string; success: boolean; data: unknown };

export type RecordingMetadata = {
  workflowId: string;
  recordingId: string;
  startedAt: string;
  stoppedAt?: string;
  status: 'recording' | 'completed' | 'error';
  duration?: number;
  actionsCount: number;
};

export type RecordingAction = {
  timestamp: string;
  type: string;
  appName?: string;
  windowTitle?: string;
  windowUrl?: string;
  text?: string;
  keys?: string;
  position?: { x: number; y: number };
  endPosition?: { x: number; y: number };
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  element?: {
    role?: string;
    title?: string;
    identifier?: string;
    frame?: { x: number; y: number; width: number; height: number };
  };
  visionActionDescription?: string;
  screenshotLocalPath?: string;
  batchTaskId?: string;
};

export type StartRecordingResponse = {
  metadata: RecordingMetadata;
  content: RecordingAction[];
};

export type StopRecordingResponse = {
  metadata: RecordingMetadata;
  content: RecordingAction[];
};

export type GetRecordingResponse = {
  metadata: RecordingMetadata;
  content: RecordingAction[];
};

export class ReflowWebSocketClient {
  private ws: WebSocket | null = null;
  private pendingRequests = new Map<string, { resolve: (value: any) => void; reject: (error: Error) => void; }>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  public connected = false;
  public coordinatorId: string | null = null;
  private hasOSClient = false;
  private hasWebClient = false;
  private clientId: string | null = null;
  private onStatusChange?: (status: {
    connected: boolean;
    hasOSClient: boolean;
    hasWebClient: boolean;
    clientId?: string | null;
  }) => void;

  constructor(
    private baseUrl: string,
    private coordinatorId_: string,
    private clientType: 'web' | 'osclient' = 'web'
  ) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const protocol = this.baseUrl.startsWith('https://') ? 'wss://' : 'ws://';
        const host = this.baseUrl.replace(/^https?:\/\//, '');
        const wsUrl = `${protocol}${host}/agents/connection-coordinator/coordinator:${this.coordinatorId_}?client=${this.clientType}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected to:', wsUrl);
          this.reconnectAttempts = 0;
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }

        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            this.handleMessage(message);

            if (message.type === 'connected' && !this.connected) {
              this.connected = true;
              this.coordinatorId = message.data.coordinatorId;
              this.hasWebClient = Boolean(message.data.hasWebClient ?? true);
              this.clientId = message.data.clientId ?? null;

              // Update OS client status from welcome message
              if (typeof message.data === 'object' && message.data !== null && 'hasOSClient' in message.data) {
                this.hasOSClient = Boolean(message.data.hasOSClient);
                console.log('WebSocket connected, OS client status:', this.hasOSClient);
              }

              console.log('WebSocket connected, coordinator ID:', message.data.coordinatorId);

              this.notifyStatusChange();

              resolve();
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.connected = false;
          this.coordinatorId = null;
          this.hasWebClient = false;
          this.hasOSClient = false;
          this.clientId = null;
          this.notifyStatusChange();

          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }

          if (!this.connected) {
            reject(new Error(`WebSocket connection failed: ${event.reason || 'Unknown error'}`));
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (!this.connected) {
            reject(new Error('WebSocket connection failed'));
          }
        };
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to create WebSocket connection'));
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect().catch(console.error);
    }, delay);
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'connected':
        console.log('Connected to coordinator:', message.data.coordinatorId);
        break;

      case 'ping':
        this.send({ type: 'pong' });
        break;

      case 'tool_response':
        const pendingRequest = this.pendingRequests.get(message.requestId);
        if (pendingRequest) {
          this.pendingRequests.delete(message.requestId);
          if (message.success) {
            pendingRequest.resolve(message.data);
          } else {
            const errorData = message.data as { error?: string };
            pendingRequest.reject(new Error(errorData?.error || 'Tool request failed'));
          }
        }
        break;

      default:
        // Check for coordinator state updates that have connection info
        if ((message as any).type === 'cf_agent_state' && (message as any).state) {
          const state = (message as any).state;
          if (state.osConnectionIds && Array.isArray(state.osConnectionIds)) {
            const hasOSClient = state.osConnectionIds.length > 0;
            if (hasOSClient !== this.hasOSClient) {
              this.hasOSClient = hasOSClient;
              console.log('Updated OS client status from state message:', hasOSClient);
            }
          }

          if (state.webConnectionIds && Array.isArray(state.webConnectionIds)) {
            const hasWebClient = state.webConnectionIds.length > 0;
            if (hasWebClient !== this.hasWebClient) {
              this.hasWebClient = hasWebClient;
              console.log('Updated web client status from state message:', hasWebClient);
            }
          }

          this.notifyStatusChange();
        }
        console.log('Received message:', message);
    }
  }

  private send(message: WebSocketMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    this.ws.send(JSON.stringify(message));
  }

  private sendToolRequest<T>(tool: string, params: Record<string, unknown>, workflowId?: string, timeoutMs = 30000): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = nanoid();

      this.pendingRequests.set(requestId, { resolve, reject });

      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Tool request timeout: ${tool}`));
        }
      }, timeoutMs);

      try {
        this.send({
          type: 'tool_request',
          requestId,
          tool,
          workflowId,
          params
        });
      } catch (error) {
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  async startRecording(workflowId: string): Promise<StartRecordingResponse> {
    return this.sendToolRequest<StartRecordingResponse>('start_recording', {}, workflowId);
  }

  async stopRecording(workflowId: string, recordingId: string): Promise<StopRecordingResponse> {
    return this.sendToolRequest<StopRecordingResponse>('stop_recording', { recordingId }, workflowId);
  }

  async getRecording(recordingId: string): Promise<GetRecordingResponse> {
    return this.sendToolRequest<GetRecordingResponse>('get_recording', { recordingId });
  }

  async executeScript({
    workflowId,
    variables,
    trace,
    enableNarration,
  }: {
    workflowId: string;
    variables?: Record<string, unknown>;
    trace?: boolean;
    enableNarration?: boolean;
  }): Promise<{
    success: boolean;
    executionTime: number;
    logs: string[];
    debugLog: string[];
    warnings: string[];
    result: unknown;
  }> {
    const params: Record<string, unknown> = {};
    if (variables && Object.keys(variables).length > 0) {
      params.variables = variables;
    }
    if (typeof trace === 'boolean') {
      params.trace = trace;
    }
    if (typeof enableNarration === 'boolean') {
      params.enable_narration = enableNarration;
    }

    return this.sendToolRequest('execute_script', params, workflowId);
  }

  async abortScript(workflowId: string): Promise<{ aborted: boolean; wasRunning: boolean }> {
    return this.sendToolRequest('abort_script', {}, workflowId);
  }


  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }


    // Clear pending requests
    for (const [, request] of this.pendingRequests) {
      request.reject(new Error('WebSocket disconnected'));
    }
    this.pendingRequests.clear();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connected = false;
    this.coordinatorId = null;
  }


  setStatusChangeCallback(callback: (status: {
    connected: boolean;
    hasOSClient: boolean;
    hasWebClient: boolean;
    clientId?: string | null;
  }) => void) {
    this.onStatusChange = callback;
  }

  getConnectionStatus() {
    return {
      connected: this.connected,
      coordinatorId: this.coordinatorId,
      hasOSClient: this.hasOSClient,
      hasWebClient: this.hasWebClient,
      clientId: this.clientId,
    };
  }

  private notifyStatusChange() {
    this.onStatusChange?.({
      connected: this.connected,
      hasOSClient: this.hasOSClient,
      hasWebClient: this.hasWebClient,
      clientId: this.clientId,
    });
  }
}
