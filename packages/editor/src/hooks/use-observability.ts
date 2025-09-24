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
  connectionStatus?: {
    hasOSClient: boolean;
    hasWebClient: boolean;
  };
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


export const useObservability = (config?: ObservabilityConfig): ObservabilityState => {
  const [state, setState] = useState<ObservabilityState>({
    status: config ? "ready" : "idle",
    recordings: [],
    toolRequests: [],
    connection: undefined,
  });

  useEffect(() => {
    if (!config) {
      setState({ status: "idle", recordings: [], toolRequests: [], connection: undefined });
      return;
    }

    // NO HTTP POLLING! Use only WebSocket-provided data
    const { connectionStatus } = config;

    setState({
      status: "ready",
      recordings: [], // Recordings come from separate recording service
      toolRequests: [], // Tool requests come via WebSocket (not implemented yet)
      connection: connectionStatus || { hasOSClient: false, hasWebClient: false },
    });

    console.log('useObservability: Using WebSocket-only mode, no HTTP polling');
  }, [config?.connectionStatus]);

  return state;
};
