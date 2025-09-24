import { WORKER_BASE_URL } from "./workflow-api";

const API_KEY = (import.meta.env.VITE_WORKER_API_KEY ?? '').trim() || undefined;

const DEFAULT_HEADERS: HeadersInit = {
  "Content-Type": "application/json",
  ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {})
};

const toUrl = (path: string): string => {
  if (!WORKER_BASE_URL) {
    return path;
  }
  if (path.startsWith("http")) {
    return path;
  }
  return `${WORKER_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(toUrl(path), {
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      ...(init?.headers ?? {})
    }
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const message = data?.error ?? response.statusText;
    throw new Error(typeof message === "string" ? message : "Request failed");
  }

  return data as T;
}

export type WorkflowRecording = {
  recordingId: string;
  status: 'recording' | 'completed' | 'error';
  data?: unknown;
  createdAt: number;
  updatedAt: number;
  stoppedAt: number | null;
  lastError: string | null;
};

export type RecordingListResponse = {
  items: WorkflowRecording[];
};

export type RecordingDetailResponse = {
  success: boolean;
  data: {
    metadata: {
      workflowId: string;
      recordingId: string;
      startedAt: string;
      stoppedAt?: string;
      status: 'recording' | 'completed' | 'error';
      duration?: number;
      actionsCount: number;
    };
    content: Array<{
      id?: string;
      timestamp: string;
      type: string;
      appName?: string;
      windowTitle?: string;
      windowUrl?: string;
      text?: string;
      keys?: string;
      position?: { x: number; y: number };
      endPosition?: { x: number; y: number };
      direction?: string;
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
    }>;
  };
};

export const listRecordings = async (workflowId: string): Promise<WorkflowRecording[]> => {
  const data = await request<RecordingListResponse>(`/workflows/${encodeURIComponent(workflowId)}/recordings`);
  return data.items ?? [];
};

export const getRecordingDetail = async (workflowId: string, recordingId: string): Promise<RecordingDetailResponse> => {
  return request<RecordingDetailResponse>(`/workflows/${encodeURIComponent(workflowId)}/recordings/${encodeURIComponent(recordingId)}`);
};