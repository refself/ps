import type { WorkflowDocument } from "@workflow-builder/core";

const DEFAULT_HEADERS: HeadersInit = {
  "Content-Type": "application/json"
};

const guessLocalWorkerUrl = () => {
  if (typeof window === "undefined") {
    return "";
  }
  const hostname = window.location.hostname;
  const port = window.location.port;
  if ((hostname === "localhost" || hostname === "127.0.0.1") && port === "5173") {
    return "http://127.0.0.1:8787";
  }
  return "";
};

const rawBaseUrl = (import.meta.env.VITE_WORKER_BASE_URL ?? guessLocalWorkerUrl() ?? "").trim();
const BASE_URL = rawBaseUrl ? rawBaseUrl.replace(/\/$/, "") : "";

const toUrl = (path: string): string => {
  if (!BASE_URL) {
    return path;
  }
  if (path.startsWith("http")) {
    return path;
  }
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
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

export type WorkerWorkflowSummary = {
  id: string;
  name?: string;
  type?: string;
  status: string;
  created_at: number;
  updated_at: number;
};

export type WorkerWorkflowVersionHeader = {
  id: string;
  name: string;
  createdAt: number;
  isNamed: boolean;
};

export type WorkerWorkflowDetail = {
  workflowId: string;
  name?: string;
  type?: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  document: WorkflowDocument;
  code: string;
  lastRestoredVersionId: string | null;
  versions: WorkerWorkflowVersionHeader[];
};

export const listWorkflows = async (): Promise<WorkerWorkflowSummary[]> => {
  const data = await request<{ items: WorkerWorkflowSummary[] }>("/workflows");
  return data.items ?? [];
};

export const createWorkflow = async (payload: {
  id?: string;
  name?: string;
  type?: string;
  status?: string;
  document: WorkflowDocument;
  code: string;
}): Promise<WorkerWorkflowDetail> => {
  return request<WorkerWorkflowDetail>("/workflows", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const getWorkflowDetail = async (id: string): Promise<WorkerWorkflowDetail> => {
  return request<WorkerWorkflowDetail>(`/workflows/${encodeURIComponent(id)}`);
};

export const updateWorkflowState = async (
  id: string,
  payload: {
    document: WorkflowDocument;
    code: string;
    type?: string;
    name?: string;
    status?: string;
  }
): Promise<WorkerWorkflowDetail> => {
  return request<WorkerWorkflowDetail>(`/workflows/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
};

export const deleteWorkflow = async (id: string): Promise<void> => {
  await request(`/workflows/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
};

export const saveWorkflowVersion = async (
  id: string,
  payload: {
    document: WorkflowDocument;
    code: string;
    name?: string;
  }
): Promise<WorkerWorkflowVersionHeader> => {
  return request<WorkerWorkflowVersionHeader>(`/workflows/${encodeURIComponent(id)}/versions`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const listWorkflowVersions = async (id: string): Promise<WorkerWorkflowVersionHeader[]> => {
  const data = await request<{ items: WorkerWorkflowVersionHeader[] }>(
    `/workflows/${encodeURIComponent(id)}/versions`
  );
  return data.items ?? [];
};

export const restoreWorkflowVersion = async (
  workflowId: string,
  versionId: string
): Promise<WorkerWorkflowDetail> => {
  return request<WorkerWorkflowDetail>(
    `/workflows/${encodeURIComponent(workflowId)}/versions/${encodeURIComponent(versionId)}/restore`,
    {
      method: "POST"
    }
  );
};

export const renameWorkflowVersion = async (
  workflowId: string,
  versionId: string,
  name: string
): Promise<WorkerWorkflowVersionHeader> => {
  return request<WorkerWorkflowVersionHeader>(
    `/workflows/${encodeURIComponent(workflowId)}/versions/${encodeURIComponent(versionId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ name })
    }
  );
};

export const deleteWorkflowVersion = async (workflowId: string, versionId: string): Promise<void> => {
  await request(`/workflows/${encodeURIComponent(workflowId)}/versions/${encodeURIComponent(versionId)}`, {
    method: "DELETE"
  });
};
