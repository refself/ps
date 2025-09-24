const API_KEY = (import.meta.env.VITE_WORKER_API_KEY ?? '').trim() || undefined;
const DEFAULT_HEADERS = {
    "Content-Type": "application/json",
    ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {})
};
const guessLocalWorkerUrl = () => {
    if (typeof window === "undefined") {
        return "";
    }
    const hostname = window.location.hostname;
    const port = window.location.port;
    if ((hostname === "localhost" || hostname === "127.0.0.1") && port === "5173") {
        return "http://localhost:8787";
    }
    return "";
};
const rawBaseUrl = (import.meta.env.VITE_WORKER_BASE_URL ?? guessLocalWorkerUrl() ?? "").trim();
const BASE_URL = rawBaseUrl ? rawBaseUrl.replace(/\/$/, "") : "";
export const WORKER_BASE_URL = BASE_URL;
const toUrl = (path) => {
    if (!BASE_URL) {
        return path;
    }
    if (path.startsWith("http")) {
        return path;
    }
    return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};
async function request(path, init) {
    const response = await fetch(toUrl(path), {
        ...init,
        headers: {
            ...DEFAULT_HEADERS,
            ...(init?.headers ?? {})
        }
    });
    if (response.status === 204) {
        return undefined;
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : undefined;
    if (!response.ok) {
        const message = data?.error ?? response.statusText;
        throw new Error(typeof message === "string" ? message : "Request failed");
    }
    return data;
}
export const listWorkflows = async () => {
    const data = await request("/workflows");
    return data.items ?? [];
};
export const createWorkflow = async (payload) => {
    return request("/workflows", {
        method: "POST",
        body: JSON.stringify(payload)
    });
};
export const getWorkflowDetail = async (id) => {
    return request(`/workflows/${encodeURIComponent(id)}`);
};
export const updateWorkflowState = async (id, payload) => {
    return request(`/workflows/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
    });
};
export const deleteWorkflow = async (id) => {
    await request(`/workflows/${encodeURIComponent(id)}`, {
        method: "DELETE"
    });
};
export const saveWorkflowVersion = async (id, payload) => {
    return request(`/workflows/${encodeURIComponent(id)}/versions`, {
        method: "POST",
        body: JSON.stringify(payload)
    });
};
export const listWorkflowVersions = async (id) => {
    const data = await request(`/workflows/${encodeURIComponent(id)}/versions`);
    return data.items ?? [];
};
export const restoreWorkflowVersion = async (workflowId, versionId) => {
    return request(`/workflows/${encodeURIComponent(workflowId)}/versions/${encodeURIComponent(versionId)}/restore`, {
        method: "POST"
    });
};
export const renameWorkflowVersion = async (workflowId, versionId, name) => {
    return request(`/workflows/${encodeURIComponent(workflowId)}/versions/${encodeURIComponent(versionId)}`, {
        method: "PATCH",
        body: JSON.stringify({ name })
    });
};
export const deleteWorkflowVersion = async (workflowId, versionId) => {
    await request(`/workflows/${encodeURIComponent(workflowId)}/versions/${encodeURIComponent(versionId)}`, {
        method: "DELETE"
    });
};
export const getConnectionStatus = async () => {
    return request(`/workflows/connections/status`);
};
export const startWorkflowRecording = async (workflowId, payload = {}) => {
    return request(`/workflows/${encodeURIComponent(workflowId)}/tools/start-recording`, {
        method: "POST",
        body: JSON.stringify(payload)
    });
};
export const stopWorkflowRecording = async (workflowId, recordingId) => {
    return request(`/workflows/${encodeURIComponent(workflowId)}/tools/stop-recording`, {
        method: "POST",
        body: JSON.stringify({ recordingId })
    });
};
