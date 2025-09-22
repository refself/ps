import { nanoid } from "nanoid";
import { createWithEqualityFn } from "zustand/traditional";
import { createJSONStorage, persist } from "zustand/middleware";

import { createDocument, generateCode } from "@workflow-builder/core";
import type { WorkflowDocument } from "@workflow-builder/core";

type WorkflowVersion = {
  id: string;
  name: string;
  createdAt: string;
  document: WorkflowDocument;
  code: string;
  isNamed: boolean;
  createdBy?: string;
  note?: string;
};

type WorkspaceWorkflow = {
  id: string;
  document: WorkflowDocument;
  code: string;
  createdAt: string;
  updatedAt: string;
  versions: WorkflowVersion[];
  lastRestoredVersionId: string | null;
};

type CreateWorkflowOptions = {
  name?: string;
  document?: WorkflowDocument;
  code?: string;
};

type SelectWorkflowOptions = {
  id: string;
};

type UpdateActiveWorkflowOptions = {
  document: WorkflowDocument;
  code: string;
};

type DeleteWorkflowOptions = {
  id: string;
};

type SaveVersionOptions = {
  workflowId: string;
  name?: string;
  document: WorkflowDocument;
  code: string;
};

type RestoreVersionOptions = {
  workflowId: string;
  versionId: string;
};

type RenameVersionOptions = {
  workflowId: string;
  versionId: string;
  name: string;
};

type DeleteVersionOptions = {
  workflowId: string;
  versionId: string;
};

type WorkspaceState = {
  workflows: WorkspaceWorkflow[];
  activeWorkflowId: string | null;
  initialized: boolean;
  bootstrap: () => void;
  createWorkflow: (options?: CreateWorkflowOptions) => WorkspaceWorkflow;
  selectWorkflow: (options: SelectWorkflowOptions) => void;
  updateActiveWorkflow: (options: UpdateActiveWorkflowOptions) => void;
  deleteWorkflow: (options: DeleteWorkflowOptions) => void;
  saveWorkflowVersion: (options: SaveVersionOptions) => void;
  restoreWorkflowVersion: (options: RestoreVersionOptions) => void;
  renameWorkflowVersion: (options: RenameVersionOptions) => void;
  deleteWorkflowVersion: (options: DeleteVersionOptions) => void;
  clearActiveWorkflow: () => void;
};

const STORAGE_KEY = "workflow-builder:workflows";
const MAX_VERSIONS = 50;

const nowIso = () => new Date().toISOString();

const cloneDocument = (document: WorkflowDocument): WorkflowDocument => {
  if (typeof structuredClone === "function") {
    return structuredClone(document);
  }
  return JSON.parse(JSON.stringify(document)) as WorkflowDocument;
};

const createVersionSnapshot = ({
  document,
  code,
  name,
  createdAt,
  isNamed
}: {
  document: WorkflowDocument;
  code: string;
  name?: string;
  createdAt: string;
  isNamed: boolean;
}): WorkflowVersion => {
  const label = name?.trim();
  return {
    id: nanoid(),
    name: label && label.length > 0 ? label : `Auto-save ${new Date(createdAt).toLocaleString()}`,
    createdAt,
    document: cloneDocument(document),
    code,
    isNamed: Boolean(label && label.length > 0)
  };
};

const createStorage = () => {
  if (typeof window === "undefined") {
    const memory = new Map<string, string>();
    return {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      }
    };
  }
  return window.localStorage;
};

export const useWorkspaceStore = createWithEqualityFn<WorkspaceState>()(
  persist(
    (set, get) => ({
      workflows: [],
      activeWorkflowId: null,
      initialized: false,
      bootstrap: () => {
        const state = get();
        if (state.initialized) {
          return;
        }
        if (state.workflows.length === 0) {
          const name = "Untitled Workflow";
          const document = createDocument({ name });
          const code = generateCode(document);
          const createdAt = document.metadata.createdAt ?? nowIso();
          const updatedAt = document.metadata.updatedAt ?? nowIso();
          const initialVersion = createVersionSnapshot({
            document,
            code,
            name: "Initial version",
            createdAt,
            isNamed: true
          });
          const workflow: WorkspaceWorkflow = {
            id: nanoid(),
            document,
            code,
            createdAt,
            updatedAt,
            versions: [initialVersion],
            lastRestoredVersionId: initialVersion.id
          };
          set({ workflows: [workflow], activeWorkflowId: null, initialized: true });
          return;
        }
        const normalized = state.workflows.map((workflow) => {
          if (workflow.versions && workflow.versions.length > 0) {
            return workflow;
          }
          const code = workflow.code ?? generateCode(workflow.document);
          const createdAt = workflow.createdAt ?? nowIso();
          const initialVersion = createVersionSnapshot({
            document: workflow.document,
            code,
            name: "Imported version",
            createdAt,
            isNamed: true
          });
          return {
            ...workflow,
            code,
            versions: [initialVersion],
            lastRestoredVersionId: initialVersion.id
          };
        });
        set({
          workflows: normalized,
          activeWorkflowId: null,
          initialized: true
        });
      },
      createWorkflow: (options?: CreateWorkflowOptions) => {
        const name = options?.name?.trim() && options?.name.trim().length > 0 ? options.name.trim() : "Untitled Workflow";
        const baseDocument = options?.document ?? createDocument({ name });
        const document = cloneDocument(baseDocument);
        document.metadata = {
          ...document.metadata,
          name,
          updatedAt: nowIso()
        };
        const storedCode = options?.code ?? generateCode(document);
        const createdAt = document.metadata.createdAt ?? nowIso();
        const updatedAt = document.metadata.updatedAt ?? nowIso();
        const initialVersion = createVersionSnapshot({
          document,
          code: storedCode,
          name: "Initial version",
          createdAt,
          isNamed: true
        });
        const workflow: WorkspaceWorkflow = {
          id: nanoid(),
          document,
          code: storedCode,
          createdAt,
          updatedAt,
          versions: [initialVersion],
          lastRestoredVersionId: initialVersion.id
        };

        set((state) => ({
          workflows: [...state.workflows, workflow],
          activeWorkflowId: workflow.id
        }));

        return workflow;
      },
      selectWorkflow: ({ id }) => {
        const state = get();
        if (state.activeWorkflowId === id) {
          return;
        }
        const exists = state.workflows.some((workflow) => workflow.id === id);
        if (!exists) {
          return;
        }
        set({ activeWorkflowId: id });
      },
      updateActiveWorkflow: ({ document, code }) => {
        const state = get();
        const activeId = state.activeWorkflowId;
        if (!activeId) {
          return;
        }
        const index = state.workflows.findIndex((workflow) => workflow.id === activeId);
        if (index === -1) {
          return;
        }
        const nextWorkflows = [...state.workflows];
        const updatedAt = nowIso();
        const nextDocument = cloneDocument(document);
        nextWorkflows[index] = {
          ...nextWorkflows[index],
          document: nextDocument,
          code,
          updatedAt,
          lastRestoredVersionId: null
        };
        set({ workflows: nextWorkflows });
      },
      deleteWorkflow: ({ id }) => {
        set((state) => {
          const remaining = state.workflows.filter((workflow) => workflow.id !== id);
          if (remaining.length === 0) {
            const name = "Untitled Workflow";
            const document = createDocument({ name });
            const code = generateCode(document);
            const createdAt = document.metadata.createdAt ?? nowIso();
            const initialVersion = createVersionSnapshot({
              document,
              code,
              name: "Initial version",
              createdAt,
              isNamed: true
            });
            const replacement: WorkspaceWorkflow = {
              id: nanoid(),
              document,
              code,
              createdAt,
              updatedAt: document.metadata.updatedAt ?? nowIso(),
              versions: [initialVersion],
              lastRestoredVersionId: initialVersion.id
            };
            return {
              workflows: [replacement],
              activeWorkflowId: null
            };
          }

          const nextActive = state.activeWorkflowId === id ? null : state.activeWorkflowId;
          return {
            workflows: remaining,
            activeWorkflowId: nextActive
          };
        });
      },
      saveWorkflowVersion: ({ workflowId, document, code, name }) => {
        const state = get();
        const index = state.workflows.findIndex((workflow) => workflow.id === workflowId);
        if (index === -1) {
          return;
        }
        const existing = state.workflows[index];
        const existingVersions = existing.versions ?? [];
        const createdAt = nowIso();
        const version = createVersionSnapshot({
          document,
          code,
          name,
          createdAt,
          isNamed: Boolean(name && name.trim().length > 0)
        });
        const versions = [version, ...existingVersions];
        if (versions.length > MAX_VERSIONS) {
          versions.pop();
        }
        const nextWorkflows = [...state.workflows];
        nextWorkflows[index] = {
          ...existing,
          versions,
          lastRestoredVersionId: version.id,
          updatedAt: createdAt
        };
        set({ workflows: nextWorkflows });
      },
      restoreWorkflowVersion: ({ workflowId, versionId }) => {
        const state = get();
        const index = state.workflows.findIndex((workflow) => workflow.id === workflowId);
        if (index === -1) {
          return;
        }
        const workflow = state.workflows[index];
        const version = workflow.versions.find((entry) => entry.id === versionId);
        if (!version) {
          return;
        }
        const restoredDocument = cloneDocument(version.document);
        const restoredCode = version.code;
        const updatedAt = nowIso();
        restoredDocument.metadata = {
          ...restoredDocument.metadata,
          updatedAt
        };
        const nextWorkflows = [...state.workflows];
        nextWorkflows[index] = {
          ...workflow,
          document: restoredDocument,
          code: restoredCode,
          updatedAt,
          lastRestoredVersionId: version.id
        };
        set({ workflows: nextWorkflows });
      },
      renameWorkflowVersion: ({ workflowId, versionId, name }) => {
        const label = name.trim();
        const state = get();
        const index = state.workflows.findIndex((workflow) => workflow.id === workflowId);
        if (index === -1) {
          return;
        }
        const workflow = state.workflows[index];
        const versions = workflow.versions.map((entry) => {
          if (entry.id !== versionId) {
            return entry;
          }
          return {
            ...entry,
            name: label.length > 0 ? label : entry.name,
            isNamed: label.length > 0 || entry.isNamed
          };
        });
        const nextWorkflows = [...state.workflows];
        nextWorkflows[index] = {
          ...workflow,
          versions
        };
        set({ workflows: nextWorkflows });
      },
      deleteWorkflowVersion: ({ workflowId, versionId }) => {
        const state = get();
        const index = state.workflows.findIndex((workflow) => workflow.id === workflowId);
        if (index === -1) {
          return;
        }
        const workflow = state.workflows[index];
        if (workflow.versions.length <= 1) {
          return;
        }
        const versions = workflow.versions.filter((entry) => entry.id !== versionId);
        if (versions.length === workflow.versions.length) {
          return;
        }
        const nextWorkflows = [...state.workflows];
        const lastRestoredVersionId = workflow.lastRestoredVersionId === versionId ? null : workflow.lastRestoredVersionId;
        nextWorkflows[index] = {
          ...workflow,
          versions,
          lastRestoredVersionId
        };
        set({ workflows: nextWorkflows });
      },
      clearActiveWorkflow: () => {
        set({ activeWorkflowId: null });
      }
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => createStorage()),
      partialize: (state) => ({
        workflows: state.workflows,
        activeWorkflowId: state.activeWorkflowId,
        initialized: state.initialized
      })
    }
  )
);

export const useActiveWorkflow = () => {
  const getSignature = (workflow: WorkspaceWorkflow | null) => {
    if (!workflow) {
      return "";
    }
    const versions = (workflow.versions ?? [])
      .map((version) => `${version.id}:${version.createdAt}:${version.name}`)
      .join("|");
    return `${workflow.updatedAt}|${workflow.lastRestoredVersionId ?? ""}|${versions}`;
  };

  return useWorkspaceStore(
    (state) => state.workflows.find((workflow) => workflow.id === state.activeWorkflowId) ?? null,
    (a, b) => a?.id === b?.id && getSignature(a) === getSignature(b)
  );
};

export const useWorkspaceList = () => {
  return useWorkspaceStore((state) =>
    state.workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.document.metadata.name,
      updatedAt: workflow.updatedAt,
      description: workflow.document.metadata.description ?? ""
    }))
  );
};
