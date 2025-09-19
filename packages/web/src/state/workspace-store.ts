import { nanoid } from "nanoid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { createDocument, generateCode } from "@workflow-builder/core";
import type { WorkflowDocument } from "@workflow-builder/core";

type WorkspaceWorkflow = {
  id: string;
  document: WorkflowDocument;
  code: string;
  createdAt: string;
  updatedAt: string;
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

type WorkspaceState = {
  workflows: WorkspaceWorkflow[];
  activeWorkflowId: string | null;
  initialized: boolean;
  bootstrap: () => void;
  createWorkflow: (options?: CreateWorkflowOptions) => WorkspaceWorkflow;
  selectWorkflow: (options: SelectWorkflowOptions) => void;
  updateActiveWorkflow: (options: UpdateActiveWorkflowOptions) => void;
  deleteWorkflow: (options: DeleteWorkflowOptions) => void;
  clearActiveWorkflow: () => void;
};

const STORAGE_KEY = "workflow-builder:workflows";

const nowIso = () => new Date().toISOString();

const cloneDocument = (document: WorkflowDocument): WorkflowDocument => {
  if (typeof structuredClone === "function") {
    return structuredClone(document);
  }
  return JSON.parse(JSON.stringify(document)) as WorkflowDocument;
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

export const useWorkspaceStore = create<WorkspaceState>()(
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
          const workflow: WorkspaceWorkflow = {
            id: nanoid(),
            document,
            code: generateCode(document),
            createdAt: document.metadata.createdAt ?? nowIso(),
            updatedAt: document.metadata.updatedAt ?? nowIso()
          };
          set({ workflows: [workflow], activeWorkflowId: null, initialized: true });
          return;
        }
        set({
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
        const workflow: WorkspaceWorkflow = {
          id: nanoid(),
          document,
          code: storedCode,
          createdAt: document.metadata.createdAt ?? nowIso(),
          updatedAt: document.metadata.updatedAt ?? nowIso()
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
        nextWorkflows[index] = {
          ...nextWorkflows[index],
          document: cloneDocument(document),
          code,
          updatedAt: document.metadata.updatedAt ?? nowIso()
        };
        set({ workflows: nextWorkflows });
      },
      deleteWorkflow: ({ id }) => {
        set((state) => {
          const remaining = state.workflows.filter((workflow) => workflow.id !== id);
          if (remaining.length === 0) {
            const name = "Untitled Workflow";
            const document = createDocument({ name });
            const replacement: WorkspaceWorkflow = {
              id: nanoid(),
              document,
              code: generateCode(document),
              createdAt: document.metadata.createdAt ?? nowIso(),
              updatedAt: document.metadata.updatedAt ?? nowIso()
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
  return useWorkspaceStore(
    (state) => state.workflows.find((workflow) => workflow.id === state.activeWorkflowId) ?? null,
    (a, b) => a?.id === b?.id && a?.updatedAt === b?.updatedAt
  );
};

export const useWorkspaceList = () => {
  return useWorkspaceStore((state) =>
    state.workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.document.metadata.name,
      updatedAt: workflow.updatedAt
    }))
  );
};
