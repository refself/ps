import { createWithEqualityFn } from "zustand/traditional";

import {
  createBlockInstance,
  createDocument,
  generateCode,
  importWorkflow,
  insertBlock,
  moveBlock as moveBlockInDocument,
  removeBlock,
  reorderChild,
  updateBlockData,
  findBlockLocation
} from "@workflow-builder/core";
import type { BlockInstance, WorkflowDocument } from "@workflow-builder/core";

import { notifyExternalListeners } from "./external-listeners";

type HistoryState = {
  past: WorkflowDocument[];
  future: WorkflowDocument[];
};

type AddBlockOptions = {
  kind: string;
  parentId: string;
  slotId: string;
  index?: number;
  initialData?: Record<string, unknown>;
};

type ReorderBlockOptions = {
  parentId: string;
  slotId: string;
  fromIndex: number;
  toIndex: number;
};

export type ExecutionStatus = {
  state: "idle" | "running" | "success" | "error";
  message: string | null;
  output: string | null;
  timestamp: number | null;
};

type EditorStore = {
  document: WorkflowDocument;
  code: string;
  selectedBlockId: string | null;
  lastError: string | null;
  history: HistoryState;
  executionStatus: ExecutionStatus;
  loadWorkflowDocument: (options: { document: WorkflowDocument; code: string }) => void;
  loadWorkflowFromCode: (code: string) => void;
  renameDocument: (name: string) => void;
  selectBlock: (blockId: string | null) => void;
  updateBlockFields: (blockId: string, updates: Record<string, unknown>) => void;
  addBlock: (options: AddBlockOptions) => string;
  deleteBlock: (blockId: string) => void;
  moveBlock: (options: { blockId: string; targetParentId: string; slotId: string; index: number }) => void;
  duplicateBlock: (blockId: string) => void;
  reorderBlock: (options: ReorderBlockOptions) => void;
  undo: () => void;
  redo: () => void;
  setExecutionStatus: (status: ExecutionStatus) => void;
};

const HISTORY_LIMIT = 50;

const safeGenerateCode = (document: WorkflowDocument) => {
  try {
    return { code: generateCode(document), error: null as string | null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { code: "", error: message };
  }
};

const ensureSelection = (document: WorkflowDocument, desired: string | null | undefined) => {
  if (!desired) {
    return null;
  }
  return document.blocks[desired] ? desired : null;
};

const pushHistoryEntry = (history: HistoryState, document: WorkflowDocument): HistoryState => {
  const nextPast = [...history.past, document];
  if (nextPast.length > HISTORY_LIMIT) {
    nextPast.shift();
  }
  return {
    past: nextPast,
    future: []
  };
};

const isDescendant = (document: WorkflowDocument, ancestorId: string, candidateId: string): boolean => {
  if (ancestorId === candidateId) {
    return true;
  }
  const ancestor = document.blocks[ancestorId];
  if (!ancestor) {
    return false;
  }
  return Object.values(ancestor.children).some((childIds) =>
    childIds.some((childId) => isDescendant(document, childId, candidateId))
  );
};

const cloneDocument = (document: WorkflowDocument): WorkflowDocument => {
  if (typeof structuredClone === "function") {
    return structuredClone(document);
  }
  return JSON.parse(JSON.stringify(document)) as WorkflowDocument;
};

let suppressExternalNotification = false;

export const useEditorStore = createWithEqualityFn<EditorStore>()((set, get) => {
  const initialDocument = createDocument({ name: "Untitled Workflow" });
  const initialCode = safeGenerateCode(initialDocument).code;

  const applyDocument = (
    nextDocument: WorkflowDocument,
    {
      pushToHistory = true,
      nextSelection
    }: { pushToHistory?: boolean; nextSelection?: string | null } = {}
  ) => {
    const { code: nextCode, error } = safeGenerateCode(nextDocument);
    set((state) => {
      const history = pushToHistory ? pushHistoryEntry(state.history, state.document) : state.history;
      const selectionSource = nextSelection !== undefined ? nextSelection : state.selectedBlockId;

      return {
        document: nextDocument,
        code: nextCode,
        lastError: error,
        history,
        selectedBlockId: ensureSelection(nextDocument, selectionSource)
      };
    });

    if (!suppressExternalNotification) {
      notifyExternalListeners(nextDocument, nextCode);
    }
  };

  return {
    document: initialDocument,
    code: initialCode,
    selectedBlockId: initialDocument.root,
    lastError: null,
    history: { past: [], future: [] },
    executionStatus: {
      state: "idle",
      message: null,
      output: null,
      timestamp: null
    },

    loadWorkflowDocument: ({ document, code }) => {
      const cloned = cloneDocument(document);
      suppressExternalNotification = true;
      set({
        document: cloned,
        code,
        lastError: null,
        history: { past: [], future: [] },
        selectedBlockId: ensureSelection(cloned, cloned.root)
      });
      suppressExternalNotification = false;
    },

    loadWorkflowFromCode: (source) => {
      try {
        const imported = importWorkflow({ code: source, name: "Imported Workflow" });
        applyDocument(imported, { nextSelection: imported.root });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        set({ lastError: message });
      }
    },

    renameDocument: (name) => {
      const current = get().document;
      const nextDocument: WorkflowDocument = {
        ...current,
        metadata: {
          ...current.metadata,
          name,
          updatedAt: new Date().toISOString()
        }
      };
      applyDocument(nextDocument, { pushToHistory: true });
    },

    selectBlock: (blockId) => {
      set((state) => ({
        selectedBlockId: ensureSelection(state.document, blockId)
      }));
    },

    updateBlockFields: (blockId, updates) => {
      try {
        const nextDocument = updateBlockData({
          document: get().document,
          blockId,
          updates
        });
        applyDocument(nextDocument, { pushToHistory: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        set({ lastError: message });
      }
    },

    addBlock: ({ kind, parentId, slotId, index, initialData }) => {
      const workingDocument = get().document;
      const block = createBlockInstance(kind, initialData ?? {});
      const targetParent = workingDocument.blocks[parentId];
      if (!targetParent) {
        throw new Error(`Parent block not found: ${parentId}`);
      }

      const position = index ?? targetParent.children[slotId]?.length ?? 0;
      const nextDocument = insertBlock({
        document: workingDocument,
        parentId,
        slotId,
        block,
        index: position
      });
      applyDocument(nextDocument, { pushToHistory: true, nextSelection: block.id });
      return block.id;
    },

    deleteBlock: (blockId) => {
      const document = get().document;
      if (!document.blocks[blockId]) {
        return;
      }

      const rootId = document.root;
      if (blockId === rootId) {
        return;
      }

      try {
        const location = findBlockLocation(document, blockId);
        if (!location) {
          return;
        }
        const nextDocument = removeBlock({
          document,
          blockId,
          parentId: location.parentId,
          slotId: location.slotId
        });
        applyDocument(nextDocument, { pushToHistory: true, nextSelection: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        set({ lastError: message });
      }
    },

    moveBlock: ({ blockId, targetParentId, slotId, index }) => {
      const document = get().document;
      if (isDescendant(document, blockId, targetParentId)) {
        return;
      }

      try {
        const nextDocument = moveBlockInDocument({
          document,
          blockId,
          parentId: targetParentId,
          slotId,
          index
        });
        applyDocument(nextDocument, { pushToHistory: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        set({ lastError: message });
      }
    },

    duplicateBlock: (blockId) => {
      const document = get().document;
      const source = document.blocks[blockId];
      if (!source) {
        return;
      }

      const location = findBlockLocation(document, blockId);
      if (!location) {
        return;
      }

      const cloneSubtree = (sourceId: string): { rootBlock: BlockInstance; blocks: Record<string, BlockInstance> } => {
        const original = document.blocks[sourceId];
        if (!original) {
          throw new Error(`Block not found: ${sourceId}`);
        }
        const clone = createBlockInstance(original.kind, { ...original.data });
        const blocks: Record<string, BlockInstance> = { [clone.id]: clone };

        Object.entries(original.children).forEach(([slotId, childIds]) => {
          const newChildIds: string[] = [];
          childIds.forEach((childId) => {
            const { rootBlock, blocks: childBlocks } = cloneSubtree(childId);
            newChildIds.push(rootBlock.id);
            Object.assign(blocks, childBlocks);
          });
          clone.children[slotId] = newChildIds;
        });

        return { rootBlock: clone, blocks };
      };

      try {
        const { rootBlock, blocks } = cloneSubtree(blockId);
        const { [rootBlock.id]: _ignored, ...descendants } = blocks;
        const workingDocument: WorkflowDocument = {
          ...document,
          blocks: {
            ...document.blocks,
            ...descendants
          }
        };

        const nextDocument = insertBlock({
          document: workingDocument,
          parentId: location.parentId,
          slotId: location.slotId,
          block: rootBlock,
          index: location.index + 1
        });
        applyDocument(nextDocument, { nextSelection: rootBlock.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        set({ lastError: message });
      }
    },

    reorderBlock: ({ parentId, slotId, fromIndex, toIndex }) => {
      try {
        const nextDocument = reorderChild({
          document: get().document,
          parentId,
          slotId,
          fromIndex,
          toIndex
        });
        applyDocument(nextDocument);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        set({ lastError: message });
      }
    },

    undo: () => {
      const { history, document, selectedBlockId } = get();
      if (history.past.length === 0) {
        return;
      }

      const previous = history.past[history.past.length - 1];
      const remainingPast = history.past.slice(0, -1);
      const { code: previousCode, error } = safeGenerateCode(previous);

      set({
        document: previous,
        code: previousCode,
        lastError: error,
        history: {
          past: remainingPast,
          future: [document, ...history.future]
        },
        selectedBlockId: ensureSelection(previous, selectedBlockId)
      });
      if (!suppressExternalNotification) {
        notifyExternalListeners(previous, previousCode);
      }
    },

    redo: () => {
      const { history, document, selectedBlockId } = get();
      if (history.future.length === 0) {
        return;
      }

      const nextDocument = history.future[0];
      const remainingFuture = history.future.slice(1);
      const { code: nextCode, error } = safeGenerateCode(nextDocument);

      set({
        document: nextDocument,
        code: nextCode,
        lastError: error,
        history: {
          past: [...history.past, document],
          future: remainingFuture
        },
        selectedBlockId: ensureSelection(nextDocument, selectedBlockId)
      });
      if (!suppressExternalNotification) {
        notifyExternalListeners(nextDocument, nextCode);
      }
    },

    setExecutionStatus: (status) => set({ executionStatus: status })
  };
});

export type { EditorStore, AddBlockOptions, ReorderBlockOptions };
