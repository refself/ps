export type ExecuteScriptResponse = {
  ok: boolean;
  output?: string | null;
  raw?: unknown;
  logs?: string[];
  error?: string;
  durationMs?: number;
};

import { WORKER_BASE_URL } from "./workflow-api";

const API_KEY = (import.meta.env.VITE_WORKER_API_KEY ?? "").trim() || undefined;

const buildUrl = (path: string) => {
  if (!WORKER_BASE_URL) {
    return path;
  }
  const base = WORKER_BASE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};

const authHeaders = (headers: HeadersInit = {}): HeadersInit => (
  API_KEY ? { ...headers, Authorization: `Bearer ${API_KEY}` } : headers
);

export const executeWorkflowScript = async ({
  workflowId,
  enableNarration = true,
}: {
  workflowId: string;
  enableNarration?: boolean;
}): Promise<ExecuteScriptResponse> => {
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

  let payload: ExecuteScriptResponse;
  try {
    payload = (await response.json()) as ExecuteScriptResponse;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to parse execute script response."
    };
  }

  if (!response.ok || !payload.ok) {
    return {
      ...payload,
      ok: false
    };
  }

  return payload;
};
