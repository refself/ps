import { WORKER_BASE_URL } from "./workflow-api";
const API_KEY = (import.meta.env.VITE_WORKER_API_KEY ?? "").trim() || undefined;
const buildUrl = (path) => {
    if (!WORKER_BASE_URL) {
        return path;
    }
    const base = WORKER_BASE_URL.replace(/\/$/, "");
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};
const authHeaders = (headers = {}) => (API_KEY ? { ...headers, Authorization: `Bearer ${API_KEY}` } : headers);
export const executeWorkflowScript = async ({ workflowId, enableNarration = true, }) => {
    if (!workflowId) {
        return { ok: false, error: "Workflow id is required." };
    }
    const url = buildUrl(`/workflows/${encodeURIComponent(workflowId)}/tools/execute-script`);
    const response = await fetch(url, {
        method: "POST",
        headers: authHeaders({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({ enable_narration: enableNarration })
    });
    let payload;
    try {
        payload = (await response.json());
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Failed to parse execute script response."
        };
    }
    if (!response.ok || payload.success === false) {
        return {
            ok: false,
            error: payload.error ?? response.statusText,
            raw: payload.data,
            data: payload.data,
        };
    }
    return {
        ok: true,
        raw: payload.data,
        data: payload.data,
    };
};
