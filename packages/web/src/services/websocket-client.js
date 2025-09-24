import { nanoid } from 'nanoid';
export class ReflowWebSocketClient {
    baseUrl;
    coordinatorId_;
    clientType;
    ws = null;
    pendingRequests = new Map();
    reconnectTimer = null;
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    reconnectDelay = 1000;
    connected = false;
    coordinatorId = null;
    hasOSClient = false;
    hasWebClient = false;
    clientId = null;
    onStatusChange;
    constructor(baseUrl, coordinatorId_, clientType = 'web') {
        this.baseUrl = baseUrl;
        this.coordinatorId_ = coordinatorId_;
        this.clientType = clientType;
    }
    connect() {
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
                        const message = JSON.parse(event.data);
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
                    }
                    catch (error) {
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
            }
            catch (error) {
                reject(error instanceof Error ? error : new Error('Failed to create WebSocket connection'));
            }
        });
    }
    scheduleReconnect() {
        if (this.reconnectTimer)
            return;
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            void this.connect().catch(console.error);
        }, delay);
    }
    handleMessage(message) {
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
                    }
                    else {
                        const errorData = message.data;
                        pendingRequest.reject(new Error(errorData?.error || 'Tool request failed'));
                    }
                }
                break;
            default:
                // Check for coordinator state updates that have connection info
                if (message.type === 'cf_agent_state' && message.state) {
                    const state = message.state;
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
    send(message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }
        this.ws.send(JSON.stringify(message));
    }
    sendToolRequest(tool, params, workflowId, timeoutMs = 30000) {
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
            }
            catch (error) {
                this.pendingRequests.delete(requestId);
                reject(error);
            }
        });
    }
    async startRecording(workflowId) {
        return this.sendToolRequest('start_recording', {}, workflowId);
    }
    async stopRecording(workflowId, recordingId) {
        return this.sendToolRequest('stop_recording', { recordingId }, workflowId);
    }
    async getRecording(recordingId) {
        return this.sendToolRequest('get_recording', { recordingId });
    }
    async executeScript({ workflowId, variables, trace, enableNarration, }) {
        const params = {};
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
    async abortScript(workflowId) {
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
    setStatusChangeCallback(callback) {
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
    notifyStatusChange() {
        this.onStatusChange?.({
            connected: this.connected,
            hasOSClient: this.hasOSClient,
            hasWebClient: this.hasWebClient,
            clientId: this.clientId,
        });
    }
}
