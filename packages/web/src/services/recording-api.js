import { WORKER_BASE_URL } from "./workflow-api";
const API_KEY = (import.meta.env.VITE_WORKER_API_KEY ?? '').trim() || undefined;
const DEFAULT_HEADERS = {
    "Content-Type": "application/json",
    ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {})
};
const toUrl = (path) => {
    if (!WORKER_BASE_URL) {
        return path;
    }
    if (path.startsWith("http")) {
        return path;
    }
    return `${WORKER_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
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
export const listRecordings = async (workflowId) => {
    const data = await request(`/workflows/${encodeURIComponent(workflowId)}/recordings`);
    return data.items ?? [];
};
export const getRecordingDetail = async (workflowId, recordingId) => {
    return request(`/workflows/${encodeURIComponent(workflowId)}/recordings/${encodeURIComponent(recordingId)}`);
};
