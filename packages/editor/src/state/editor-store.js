import { createWithEqualityFn } from "zustand/traditional";
import { createBlockInstance, createDocument, generateCode, importWorkflow, insertBlock, moveBlock as moveBlockInDocument, removeBlock, reorderChild, updateBlockData, findBlockLocation } from "@workflow-builder/core";
import { notifyExternalListeners } from "./external-listeners";
const HISTORY_LIMIT = 50;
const safeGenerateCode = (document) => {
    try {
        return { code: generateCode(document), error: null };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { code: "", error: message };
    }
};
const ensureSelection = (document, desired) => {
    if (!desired) {
        return null;
    }
    return document.blocks[desired] ? desired : null;
};
const pushHistoryEntry = (history, document) => {
    const nextPast = [...history.past, document];
    if (nextPast.length > HISTORY_LIMIT) {
        nextPast.shift();
    }
    return {
        past: nextPast,
        future: []
    };
};
const isDescendant = (document, ancestorId, candidateId) => {
    if (ancestorId === candidateId) {
        return true;
    }
    const ancestor = document.blocks[ancestorId];
    if (!ancestor) {
        return false;
    }
    return Object.values(ancestor.children).some((childIds) => childIds.some((childId) => isDescendant(document, childId, candidateId)));
};
const cloneDocument = (document) => {
    if (typeof structuredClone === "function") {
        return structuredClone(document);
    }
    return JSON.parse(JSON.stringify(document));
};
let suppressExternalNotification = false;
export const useEditorStore = createWithEqualityFn()((set, get) => {
    const initialDocument = createDocument({ name: "Untitled Workflow" });
    const initialCode = safeGenerateCode(initialDocument).code;
    const applyDocument = (nextDocument, { pushToHistory = true, nextSelection } = {}) => {
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
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                set({ lastError: message });
            }
        },
        renameDocument: (name) => {
            const current = get().document;
            const nextDocument = {
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
            }
            catch (error) {
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
            }
            catch (error) {
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
            }
            catch (error) {
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
            const cloneSubtree = (sourceId) => {
                const original = document.blocks[sourceId];
                if (!original) {
                    throw new Error(`Block not found: ${sourceId}`);
                }
                const clone = createBlockInstance(original.kind, { ...original.data });
                const blocks = { [clone.id]: clone };
                Object.entries(original.children).forEach(([slotId, childIds]) => {
                    const newChildIds = [];
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
                const workingDocument = {
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
            }
            catch (error) {
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
            }
            catch (error) {
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
