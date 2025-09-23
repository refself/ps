# Workflow System Architecture

## **Per-User Isolated Architecture**

This system uses **per-user ConnectionCoordinator instances** for complete user isolation and security.

### 🏗️ **Agent Architecture:**

```
User A: macOS App ──┐
                    ▼
User A: Web App ────▶ ConnectionCoordinator("coordinator:userA") ──── Agent RPC ────▶ WorkflowAgent("workflow-123")
                    (single hub per user)                                              WorkflowAgent("workflow-456")

User B: macOS App ──┐
                    ▼
User B: Web App ────▶ ConnectionCoordinator("coordinator:userB") ──── Agent RPC ────▶ WorkflowAgent("workflow-789")
                    (isolated per user)
```

### 🔐 **Security & Isolation:**

**✅ Per-User Coordinators:**
- Each user gets their own `ConnectionCoordinator` instance
- Instance name: `coordinator:${userId}`
- **Complete isolation** - users can't access each other's data
- **JWT authentication** at WebSocket connection time

**✅ Clean Authentication Flow:**
1. **JWT extraction** from connection URL: `?token=eyJ...`
2. **User verification** and coordinator routing
3. **Authenticated connections** only - no unauthenticated access

### 🔌 **Connection Strategy:**

**Single WebSocket Endpoint for Both Clients:**
```
ws://your-worker/agents/connection-coordinator/coordinator:${userId}?client=web&workflowId=123&token=jwt
ws://your-worker/agents/connection-coordinator/coordinator:${userId}?client=osclient&token=jwt
```

**Connection Types:**
- **macOS App**: `client=osclient` - tool execution capabilities
- **Web App**: `client=web&workflowId=X` - workflow-specific updates

### 🚀 **Agent Responsibilities:**

**🔹 ConnectionCoordinator (per user):**
- **All WebSocket connections** for one user
- **JWT authentication** and connection management
- **Message routing** by client type and workflowId
- **OS client tool request/response handling**
- **Real-time updates** to web clients

**🔹 WorkflowAgent (per workflow):**
- **Pure business logic** - no WebSocket code
- **Workflow state management**
- **Version control and persistence**
- **Tool delegation** to user's coordinator

### 🛠️ **Tool Execution Flow:**

1. **Web app** → `POST /workflows/123/tools/execute-script` (with JWT)
2. **Route middleware** → validates JWT and extracts `userId`
3. **WorkflowAgent** → `executeScript(userId, params)`
4. **WorkflowAgent** → calls `getConnectionCoordinator(userId)`
5. **ConnectionCoordinator** → finds user's OS client connection
6. **ConnectionCoordinator** → sends tool request via WebSocket
7. **macOS app** → executes and responds
8. **ConnectionCoordinator** → routes response back to WorkflowAgent
9. **WorkflowAgent** → returns result to web app

### 📡 **API Endpoints:**

```typescript
// WebSocket (all clients - per user)
ws://worker/agents/connection-coordinator/coordinator:${userId}

// HTTP Tool APIs (authenticated)
POST /workflows/:id/tools/execute-script    # Execute Reflow script
POST /workflows/:id/tools/start-recording   # Start screen recording
POST /workflows/:id/tools/stop-recording    # Stop recording
GET  /workflows/:id/tools/recording/:id     # Get recorded actions
```

## **Benefits**

✅ **Complete User Isolation**: Per-user coordinator instances
✅ **Single Connection Hub**: Both clients connect to same coordinator
✅ **JWT Security**: All connections authenticated
✅ **Clean Separation**: Coordinator handles connections, Workflows handle logic
✅ **Agent RPC**: Built-in communication between agents
✅ **Real-time Sync**: WebSocket updates for workflow changes
✅ **Type Safety**: End-to-end Zod + TypeScript validation