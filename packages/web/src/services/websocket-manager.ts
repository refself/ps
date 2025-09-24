import { ReflowWebSocketClient } from './websocket-client';

// Hardcoded coordinator ID until auth is implemented
const COORDINATOR_ID = 'aceca593-9511-4621-a567-449207737244';

const guessLocalWorkerUrl = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  const hostname = window.location.hostname;
  const port = window.location.port;
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '5173') {
    return 'http://localhost:8787';
  }
  return '';
};

const rawBaseUrl = (import.meta.env.VITE_WORKER_BASE_URL ?? guessLocalWorkerUrl() ?? '').trim();
const BASE_URL = rawBaseUrl ? rawBaseUrl.replace(/\/$/, '') : '';

type ConnectionStatus = {
  connected: boolean;
  hasOSClient: boolean;
  hasWebClient: boolean;
  error?: string;
};

type ConnectionListener = {
  onStatusChange: (status: ConnectionStatus) => void;
};

class WebSocketManager {
  private client: ReflowWebSocketClient | null = null;
  private listeners: Set<ConnectionListener> = new Set();
  private connectionPromise: Promise<void> | null = null;
  private status: ConnectionStatus = {
    connected: false,
    hasOSClient: false,
    hasWebClient: false,
    error: undefined
  };

  async getConnection(): Promise<ReflowWebSocketClient> {
    if (this.client?.connected) {
      return this.client;
    }

    if (!this.connectionPromise) {
      this.connectionPromise = (async () => {
        try {
          await this.connect();
        } catch (error) {
          if (this.client) {
            this.client.disconnect();
            this.client = null;
          }
          throw error;
        }
      })();
    }

    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
      if (!this.client?.connected) {
        this.client = null;
      }
    }

    if (!this.client?.connected) {
      throw new Error('Failed to establish WebSocket connection');
    }

    return this.client;
  }

  private async connect(): Promise<void> {
    try {
      console.log('WebSocketManager: Creating new connection to coordinator:', COORDINATOR_ID);

      this.client = new ReflowWebSocketClient(BASE_URL, COORDINATOR_ID, 'web');

      this.client.setStatusChangeCallback(({ connected, hasOSClient, hasWebClient, clientId }) => {
        console.log('[WSM] status change', { connected, hasOSClient, hasWebClient, clientId });
        const wasConnected = this.status.connected;

        this.patchStatus({
          connected,
          hasOSClient,
          hasWebClient,
          error: connected ? undefined : this.status.error,
        });

        if (!connected && wasConnected) {
          console.log('[WSM] clearing stale client reference');
          this.client = null;
        }
      });

      await this.client.connect();

      const activeClient = this.client;
      if (!activeClient) {
        throw new Error('WebSocket client unavailable after connect');
      }

      // Get the connection status from the client (populated by welcome message)
      const clientStatus = activeClient.getConnectionStatus();

      this.setStatus({
        connected: true,
        hasOSClient: clientStatus.hasOSClient,
        hasWebClient: clientStatus.hasWebClient,
        error: undefined
      });

      console.log('WebSocketManager: Status updated:', this.status);
      console.log('WebSocketManager: Connected successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      console.error('WebSocketManager: Connection failed:', error);

      this.setStatus({
        connected: false,
        hasOSClient: false,
        hasWebClient: false,
        error: errorMessage
      });
      throw error;
    }
  }

  addListener(listener: ConnectionListener): void {
    this.listeners.add(listener);
    listener.onStatusChange({ ...this.status });
  }

  removeListener(listener: ConnectionListener): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const snapshot = { ...this.status };
    this.listeners.forEach(listener => {
      listener.onStatusChange(snapshot);
    });
  }

  getStatus() {
    return { ...this.status };
  }

  disconnect(): void {
    if (this.client) {
      console.log('WebSocketManager: Disconnecting');
      this.client.disconnect();
      this.client = null;
    }
    this.connectionPromise = null;
    this.setStatus({
      connected: false,
      hasOSClient: false,
      hasWebClient: false,
      error: undefined
    });
  }

  // Recording operations
  async startRecording(workflowId: string): Promise<any> {
    const client = await this.getConnection();
    return client.startRecording(workflowId);
  }

  async stopRecording(workflowId: string, recordingId: string): Promise<any> {
    const client = await this.getConnection();
    return client.stopRecording(workflowId, recordingId);
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
  }): Promise<any> {
    const client = await this.getConnection();
    return client.executeScript({ workflowId, variables, trace, enableNarration });
  }

  async abortScript(workflowId: string): Promise<{ aborted: boolean; wasRunning: boolean }> {
    const client = await this.getConnection();
    return client.abortScript(workflowId);
  }

  private setStatus(next: ConnectionStatus) {
    this.status = { ...next };
    this.notifyListeners();
  }

  private patchStatus(partial: Partial<ConnectionStatus>) {
    this.setStatus({ ...this.status, ...partial });
  }
}

// Singleton instance
export const webSocketManager = new WebSocketManager();
export default webSocketManager;
