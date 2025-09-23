import { useEffect, useState } from "react";

export type RecordingStatus = "recording" | "completed" | "error";
export type ToolRequestStatus = "pending" | "success" | "error";

export interface ObservabilityRecording {
  recordingId: string;
  status: RecordingStatus;
  data?: unknown;
  createdAt: number;
  updatedAt: number;
  stoppedAt: number | null;
  lastError: string | null;
}

export interface ObservabilityToolRequest {
  requestId: string;
  workflowId: string;
  tool: string;
  params?: unknown;
  status: ToolRequestStatus;
  responseData?: unknown;
  error?: string | null;
  createdAt: number;
  resolvedAt?: number | null;
}

export interface ObservabilityConfig {
  workflowId: string;
  baseUrl: string;
  apiKey?: string;
  pollIntervalMs?: number;
}

interface ObservabilityState {
  status: "idle" | "loading" | "ready" | "error";
  recordings: ObservabilityRecording[];
  toolRequests: ObservabilityToolRequest[];
  error?: string;
  connection?: {
    hasOSClient: boolean;
    hasWebClient: boolean;
  };
}

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/$/, "");

const buildUrl = (baseUrl: string, path: string) => {
  if (!baseUrl) {
    return path;
  }
  const normalized = normalizeBaseUrl(baseUrl);
  return `${normalized}${path.startsWith("/") ? path : `/${path}`}`;
};

async function fetchJson<T>(url: string, apiKey?: string): Promise<T> {
  const response = await fetch(url, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || response.statusText);
  }

  return response.json() as Promise<T>;
}

export const useObservability = (config?: ObservabilityConfig): ObservabilityState => {
  const [state, setState] = useState<ObservabilityState>({
    status: config ? "loading" : "idle",
    recordings: [],
    toolRequests: [],
    connection: undefined,
  });

  useEffect(() => {
    if (!config) {
      setState({ status: "idle", recordings: [], toolRequests: [], connection: undefined });
      return;
    }

    const { workflowId, baseUrl, apiKey, pollIntervalMs = 5000 } = config;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const run = async () => {
      try {
        const detailUrl = buildUrl(baseUrl, `/workflows/${encodeURIComponent(workflowId)}`);
        const requestsUrl = buildUrl(baseUrl, `/workflows/${encodeURIComponent(workflowId)}/tools/requests?limit=50`);
        const statusUrl = buildUrl(baseUrl, `/workflows/connections/status`);

        const [detail, requests, connection] = await Promise.all([
          fetchJson<{ recordings?: ObservabilityRecording[] }>(detailUrl, apiKey),
          fetchJson<{ items?: ObservabilityToolRequest[] }>(requestsUrl, apiKey),
          fetchJson<{ hasOSClient: boolean; hasWebClient: boolean }>(statusUrl, apiKey).catch(() => ({
            hasOSClient: false,
            hasWebClient: false,
          })),
        ]);

        if (cancelled) {
          return;
        }

        setState({
          status: "ready",
          recordings: detail.recordings ?? [],
          toolRequests: requests.items ?? [],
          connection,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Failed to load observability data";
        setState((prev) => ({
          ...prev,
          status: "error",
          error: message,
        }));
      }
    };

    setState({ status: "loading", recordings: [], toolRequests: [], connection: undefined });
    void run();
    timer = setInterval(run, pollIntervalMs);

    return () => {
      cancelled = true;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [config?.workflowId, config?.baseUrl, config?.apiKey, config?.pollIntervalMs]);

  return state;
};
