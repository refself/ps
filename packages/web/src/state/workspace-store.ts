import { createWithEqualityFn } from "zustand/traditional";

import { createDocument, generateCode } from "@workflows/core";
import type { WorkflowDocument } from "@workflows/core";

import {
  listWorkflows,
  createWorkflow as createWorkflowApi,
  getWorkflowDetail,
  updateWorkflowState,
  deleteWorkflow as deleteWorkflowApi,
  saveWorkflowVersion as saveWorkflowVersionApi,
  restoreWorkflowVersion as restoreWorkflowVersionApi,
  renameWorkflowVersion as renameWorkflowVersionApi,
  deleteWorkflowVersion as deleteWorkflowVersionApi,
  type WorkerWorkflowDetail,
  type WorkerWorkflowSummary,
  type WorkerWorkflowVersionHeader
} from "../services/workflow-api";

type WorkflowListItem = {
  id: string;
  name: string;
  status: string;
  type?: string;
  createdAt: string;
  updatedAt: string;
};

type WorkflowVersion = WorkerWorkflowVersionHeader & {
  createdAtIso: string;
};

type ActiveWorkflow = {
  id: string;
  name: string;
  status: string;
  type?: string;
  createdAt: string;
  updatedAt: string;
  document: WorkflowDocument;
  code: string;
  lastRestoredVersionId: string | null;
  versions: WorkflowVersion[];
};

type WorkspaceState = {
  workflows: WorkflowListItem[];
  activeWorkflowId: string | null;
  activeWorkflow: ActiveWorkflow | null;
  initialized: boolean;
  loadingList: boolean;
  loadingDetail: boolean;
  error?: string;
  bootstrap: () => Promise<void>;
  createWorkflow: (options?: { name?: string; type?: string }) => Promise<void>;
  selectWorkflow: (options: { id: string }) => Promise<void>;
  updateActiveWorkflow: (options: {
    document: WorkflowDocument;
    code: string;
    type?: string;
    name?: string;
    status?: string;
  }) => void;
  deleteWorkflow: (options: { id: string }) => Promise<void>;
  saveWorkflowVersion: (options: {
    workflowId: string;
    document: WorkflowDocument;
    code: string;
    name?: string;
  }) => Promise<void>;
  restoreWorkflowVersion: (options: { workflowId: string; versionId: string }) => Promise<void>;
  renameWorkflowVersion: (options: { workflowId: string; versionId: string; name: string }) => Promise<void>;
  deleteWorkflowVersion: (options: { workflowId: string; versionId: string }) => Promise<void>;
  clearActiveWorkflow: () => void;
  refreshActiveWorkflow: () => Promise<void>;
};

const deriveNameFromDocument = (document: WorkflowDocument): string => {
  const metadataName = document.metadata?.name?.trim();
  if (metadataName && metadataName.length > 0) {
    return metadataName;
  }
  return "Untitled Workflow";
};

const toIso = (value: number): string => new Date(value).toISOString();

const mapSummary = (summary: WorkerWorkflowSummary): WorkflowListItem => {
  const fallbackName = summary.name?.trim() ?? summary.id;
  return {
    id: summary.id,
    name: fallbackName.length > 0 ? fallbackName : summary.id,
    status: summary.status,
    type: summary.type ?? undefined,
    createdAt: toIso(summary.created_at),
    updatedAt: toIso(summary.updated_at)
  };
};

const mapVersion = (header: WorkerWorkflowVersionHeader): WorkflowVersion => ({
  ...header,
  createdAtIso: toIso(header.createdAt)
});


const mapDetail = (detail: WorkerWorkflowDetail): ActiveWorkflow => {
  const nameFromDocument = deriveNameFromDocument(detail.document);
  const trimmedName = detail.name?.trim();
  return {
    id: detail.workflowId,
    name: trimmedName && trimmedName.length > 0 ? trimmedName : nameFromDocument,
    status: detail.status,
    type: detail.type ?? undefined,
    createdAt: toIso(detail.createdAt),
    updatedAt: toIso(detail.updatedAt),
    document: detail.document,
    code: detail.code,
    lastRestoredVersionId: detail.lastRestoredVersionId,
    versions: (detail.versions ?? []).map(mapVersion)
  };
};

let pendingUpdateTimer: ReturnType<typeof setTimeout> | null = null;
let pendingUpdatePayload: {
  workflowId: string;
  document: WorkflowDocument;
  code: string;
  type?: string;
  name?: string;
  status?: string;
} | null = null;

const flushPendingUpdate = async (get: () => WorkspaceState, set: (fn: (state: WorkspaceState) => WorkspaceState) => void) => {
  const payload = pendingUpdatePayload;
  pendingUpdatePayload = null;
  pendingUpdateTimer = null;
  if (!payload) {
    return;
  }
  try {
    const detail = await updateWorkflowState(payload.workflowId, {
      document: payload.document,
      code: payload.code,
      type: payload.type,
      name: payload.name,
      status: payload.status
    });
    const mapped = mapDetail(detail);
    set((state) => {
      const workflows = state.workflows.map((item) =>
        item.id === mapped.id
          ? {
              ...item,
              name: mapped.name,
              status: mapped.status,
              type: mapped.type,
              updatedAt: mapped.updatedAt
            }
          : item
      );
      const activeWorkflow = state.activeWorkflowId === mapped.id ? mapped : state.activeWorkflow;
      return {
        ...state,
        workflows,
        activeWorkflow
      };
    });
  } catch (error) {
    console.error("Failed to sync workflow state", error);
  }
};

export const useWorkspaceStore = createWithEqualityFn<WorkspaceState>()((set, get) => ({
  workflows: [],
  activeWorkflowId: null,
  activeWorkflow: null,
  initialized: false,
  loadingList: false,
  loadingDetail: false,
  error: undefined,
  bootstrap: async () => {
    const state = get();
    if (state.initialized || state.loadingList) {
      return;
    }
    set((prev) => ({ ...prev, loadingList: true, error: undefined }));
    try {
      const summaries = await listWorkflows();
      const workflows = summaries.map(mapSummary);
      set((prev) => ({
        ...prev,
        workflows,
        loadingList: false,
        initialized: true
      }));
    } catch (error) {
      console.error("Failed to load workflows", error);
      set((prev) => ({
        ...prev,
        loadingList: false,
        initialized: true,
        error: error instanceof Error ? error.message : "Failed to load workflows"
      }));
    }
  },
  createWorkflow: async ({ name, type } = {}) => {
    const initialName = name?.trim() ?? "Untitled Workflow";
    const document = createDocument({ name: initialName });
    const code = generateCode(document);
    try {
      const detail = await createWorkflowApi({
        name: initialName,
        type,
        document,
        code
      });
      const mappedDetail = mapDetail(detail);
      set((prev) => ({
        ...prev,
        workflows: [mapSummary({
          id: detail.workflowId,
          name: mappedDetail.name,
          status: mappedDetail.status,
          type: mappedDetail.type,
          created_at: detail.createdAt,
          updated_at: detail.updatedAt
        }), ...prev.workflows],
        activeWorkflowId: mappedDetail.id,
        activeWorkflow: mappedDetail
      }));
    } catch (error) {
      console.error("Failed to create workflow", error);
      set((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to create workflow"
      }));
    }
  },
  selectWorkflow: async ({ id }) => {
    const state = get();
    if (state.activeWorkflowId === id && state.activeWorkflow) {
      return;
    }
    set((prev) => ({ ...prev, loadingDetail: true, error: undefined, activeWorkflowId: id }));
    try {
      const detail = await getWorkflowDetail(id);
      const mapped = mapDetail(detail);
      set((prev) => {
        const workflows = prev.workflows.map((item) =>
          item.id === mapped.id
            ? {
                ...item,
                name: mapped.name,
                status: mapped.status,
                type: mapped.type,
                updatedAt: mapped.updatedAt
              }
            : item
        );
        return {
          ...prev,
          workflows,
          activeWorkflowId: mapped.id,
          activeWorkflow: mapped,
          loadingDetail: false
        };
      });
    } catch (error) {
      console.error("Failed to load workflow detail", error);
      set((prev) => ({
        ...prev,
        loadingDetail: false,
        error: error instanceof Error ? error.message : "Failed to load workflow",
        activeWorkflow: null
      }));
    }
  },
  updateActiveWorkflow: ({ document, code, type, name, status }) => {
    const state = get();
    if (!state.activeWorkflowId || !state.activeWorkflow) {
      return;
    }
    const workflowId = state.activeWorkflowId;
    const derivedName = name?.trim() ?? deriveNameFromDocument(document);
    const updatedAtIso = new Date().toISOString();

    set((prev) => {
      if (!prev.activeWorkflow || prev.activeWorkflow.id !== workflowId) {
        return prev;
      }
      const updatedActive: ActiveWorkflow = {
        ...prev.activeWorkflow,
        document,
        code,
        type: type ?? prev.activeWorkflow.type,
        status: status ?? prev.activeWorkflow.status,
        name: derivedName,
        updatedAt: updatedAtIso
      };
      const workflows = prev.workflows.map((item) =>
        item.id === workflowId
          ? {
              ...item,
              name: derivedName,
              updatedAt: updatedAtIso,
              status: updatedActive.status,
              type: updatedActive.type
            }
          : item
      );
      return {
        ...prev,
        workflows,
        activeWorkflow: updatedActive
      };
    });

    pendingUpdatePayload = {
      workflowId,
      document,
      code,
      type,
      name: derivedName,
      status
    };

    if (pendingUpdateTimer) {
      clearTimeout(pendingUpdateTimer);
    }
    pendingUpdateTimer = setTimeout(() => {
      flushPendingUpdate(get, (updater) => set((current) => updater(current)));
    }, 500);
  },
  deleteWorkflow: async ({ id }) => {
    try {
      await deleteWorkflowApi(id);
      set((prev) => {
        const workflows = prev.workflows.filter((item) => item.id !== id);
        const isActive = prev.activeWorkflowId === id;
        return {
          ...prev,
          workflows,
          activeWorkflowId: isActive ? null : prev.activeWorkflowId,
          activeWorkflow: isActive ? null : prev.activeWorkflow
        };
      });
    } catch (error) {
      console.error("Failed to delete workflow", error);
      set((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to delete workflow"
      }));
    }
  },
  saveWorkflowVersion: async ({ workflowId, document, code, name }) => {
    try {
      const version = await saveWorkflowVersionApi(workflowId, {
        document,
        code,
        name
      });
      set((prev) => {
        if (!prev.activeWorkflow || prev.activeWorkflow.id !== workflowId) {
          return prev;
        }
        const versions = [mapVersion(version), ...prev.activeWorkflow.versions.filter((v) => v.id !== version.id)];
        return {
          ...prev,
          activeWorkflow: {
            ...prev.activeWorkflow,
            document,
            code,
            versions,
            lastRestoredVersionId: version.id,
            updatedAt: toIso(Date.now())
          }
        };
      });
    } catch (error) {
      console.error("Failed to save workflow version", error);
      set((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to save version"
      }));
    }
  },
  restoreWorkflowVersion: async ({ workflowId, versionId }) => {
    try {
      const detail = await restoreWorkflowVersionApi(workflowId, versionId);
      const mapped = mapDetail(detail);
      set((prev) => {
        const workflows = prev.workflows.map((item) =>
          item.id === mapped.id
            ? {
                ...item,
                name: mapped.name,
                status: mapped.status,
                type: mapped.type,
                updatedAt: mapped.updatedAt
              }
            : item
        );
        return {
          ...prev,
          workflows,
          activeWorkflow: mapped
        };
      });
    } catch (error) {
      console.error("Failed to restore version", error);
      set((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to restore version"
      }));
    }
  },
  renameWorkflowVersion: async ({ workflowId, versionId, name }) => {
    try {
      const version = await renameWorkflowVersionApi(workflowId, versionId, name);
      set((prev) => {
        if (!prev.activeWorkflow || prev.activeWorkflow.id !== workflowId) {
          return prev;
        }
        const versions = prev.activeWorkflow.versions.map((item) =>
          item.id === version.id
            ? {
                ...item,
                name: version.name,
                isNamed: version.isNamed,
                createdAt: version.createdAt,
                createdAtIso: toIso(version.createdAt)
              }
            : item
        );
        return {
          ...prev,
          activeWorkflow: {
            ...prev.activeWorkflow,
            versions
          }
        };
      });
    } catch (error) {
      console.error("Failed to rename version", error);
      set((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to rename version"
      }));
    }
  },
  deleteWorkflowVersion: async ({ workflowId, versionId }) => {
    try {
      await deleteWorkflowVersionApi(workflowId, versionId);
      set((prev) => {
        if (!prev.activeWorkflow || prev.activeWorkflow.id !== workflowId) {
          return prev;
        }
        const versions = prev.activeWorkflow.versions.filter((item) => item.id !== versionId);
        const lastRestoredVersionId = prev.activeWorkflow.lastRestoredVersionId === versionId
          ? null
          : prev.activeWorkflow.lastRestoredVersionId;
        return {
          ...prev,
          activeWorkflow: {
            ...prev.activeWorkflow,
            versions,
            lastRestoredVersionId
          }
        };
      });
    } catch (error) {
      console.error("Failed to delete version", error);
      set((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to delete version"
      }));
    }
  },
  refreshActiveWorkflow: async () => {
    const state = get();
    const workflowId = state.activeWorkflowId;
    if (!workflowId) {
      return;
    }
    try {
      const detail = await getWorkflowDetail(workflowId);
      const mapped = mapDetail(detail);
      set((prev) => {
        if (!prev.activeWorkflow || prev.activeWorkflow.id !== workflowId) {
          return prev;
        }
        const workflows = prev.workflows.map((item) =>
          item.id === mapped.id
            ? {
                ...item,
                name: mapped.name,
                status: mapped.status,
                type: mapped.type,
                updatedAt: mapped.updatedAt
              }
            : item
        );
        return {
          ...prev,
          workflows,
          activeWorkflow: mapped
        };
      });
    } catch (error) {
      console.error("Failed to refresh workflow detail", error);
    }
  },
  clearActiveWorkflow: () => {
    if (pendingUpdateTimer) {
      clearTimeout(pendingUpdateTimer);
      pendingUpdateTimer = null;
      pendingUpdatePayload = null;
    }
    set((prev) => ({
      ...prev,
      activeWorkflowId: null,
      activeWorkflow: null
    }));
  }
}));

export const useActiveWorkflow = () => {
  return useWorkspaceStore(
    (state) => state.activeWorkflow,
    (a, b) =>
      a?.id === b?.id &&
      a?.updatedAt === b?.updatedAt &&
      a?.versions.length === b?.versions.length
  );
};

export const useWorkspaceList = () => {
  return useWorkspaceStore((state) => state.workflows);
};
