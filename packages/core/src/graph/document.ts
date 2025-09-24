import { nanoid } from "nanoid";

import { blockRegistry } from "../blocks";
import type { BlockInstance, WorkflowDocument } from "../types";

const nowIso = () => new Date().toISOString();

export type BlockLocation = {
  parentId: string;
  slotId: string;
  index: number;
};

export const findBlockLocation = (document: WorkflowDocument, blockId: string): BlockLocation | null => {
  for (const [parentId, block] of Object.entries(document.blocks)) {
    for (const [slotId, childIds] of Object.entries(block.children)) {
      const index = childIds.indexOf(blockId);
      if (index !== -1) {
        return { parentId, slotId, index };
      }
    }
  }
  return null;
};

const updateParentChildren = ({
  document,
  parentId,
  slotId,
  updater
}: {
  document: WorkflowDocument;
  parentId: string;
  slotId: string;
  updater: (current: string[]) => string[];
}): WorkflowDocument => {
  const parent = document.blocks[parentId];
  if (!parent) {
    throw new Error(`Parent block not found: ${parentId}`);
  }

  const slot = parent.children[slotId];
  if (!slot) {
    throw new Error(`Slot "${slotId}" not found on block ${parentId}`);
  }

  const nextSlot = updater(slot);

  const nextParent: BlockInstance = {
    ...parent,
    children: {
      ...parent.children,
      [slotId]: nextSlot
    }
  };

  return {
    ...document,
    blocks: {
      ...document.blocks,
      [parentId]: nextParent
    },
    metadata: {
      ...document.metadata,
      updatedAt: nowIso()
    }
  };
};

export const detachBlock = ({
  document,
  blockId
}: {
  document: WorkflowDocument;
  blockId: string;
}): { document: WorkflowDocument; location: BlockLocation | null } => {
  const location = findBlockLocation(document, blockId);
  if (!location) {
    return { document, location: null };
  }

  const nextDocument = updateParentChildren({
    document,
    parentId: location.parentId,
    slotId: location.slotId,
    updater: (slot) => slot.filter((id, index) => index !== location.index)
  });

  return { document: nextDocument, location };
};

export const attachBlock = ({
  document,
  blockId,
  parentId,
  slotId,
  index
}: {
  document: WorkflowDocument;
  blockId: string;
  parentId: string;
  slotId: string;
  index?: number;
}): WorkflowDocument => {
  if (!document.blocks[blockId]) {
    throw new Error(`Block not found: ${blockId}`);
  }

  return updateParentChildren({
    document,
    parentId,
    slotId,
    updater: (slot) => {
      const insertionIndex = index !== undefined ? Math.min(Math.max(index, 0), slot.length) : slot.length;
      const nextSlot = [...slot];
      nextSlot.splice(insertionIndex, 0, blockId);
      return nextSlot;
    }
  });
};

export const moveBlock = ({
  document,
  blockId,
  parentId,
  slotId,
  index
}: {
  document: WorkflowDocument;
  blockId: string;
  parentId: string;
  slotId: string;
  index: number;
}): WorkflowDocument => {
  const currentLocation = findBlockLocation(document, blockId);
  if (!currentLocation) {
    return document;
  }

  let targetIndex = index;
  if (
    currentLocation.parentId === parentId &&
    currentLocation.slotId === slotId &&
    index > currentLocation.index
  ) {
    targetIndex = Math.max(currentLocation.index, index - 1);
  }

  const { document: detachedDocument } = detachBlock({ document, blockId });
  return attachBlock({
    document: detachedDocument,
    blockId,
    parentId,
    slotId,
    index: targetIndex
  });
};

export const createBlockInstance = (kind: string, data: Record<string, unknown> = {}): BlockInstance => {
  const schema = blockRegistry.get(kind);
  if (!schema) {
    throw new Error(`Unsupported block kind: ${kind}`);
  }

  const defaultData: Record<string, unknown> = {};
  schema.fields.forEach((field) => {
    if (field.defaultValue !== undefined) {
      defaultData[field.id] = field.defaultValue;
    }
  });

  const children: Record<string, string[]> = {};
  schema.childSlots.forEach((slot) => {
    children[slot.id] = [];
  });

  return {
    id: nanoid(),
    kind,
    data: { ...defaultData, ...data },
    children
  };
};

export const createDocument = ({ name }: { name: string }): WorkflowDocument => {
  const program = createBlockInstance("program");

  return {
    id: nanoid(),
    root: program.id,
    blocks: {
      [program.id]: program
    },
    connections: [],
    metadata: {
      name,
      createdAt: nowIso(),
      updatedAt: nowIso()
    },
    version: 1
  };
};

const collectDescendantIds = ({ blockId, blocks }: { blockId: string; blocks: Record<string, BlockInstance> }): string[] => {
  const target = blocks[blockId];
  if (!target) {
    return [];
  }

  const collected: string[] = [];
  Object.values(target.children).forEach((childIds) => {
    childIds.forEach((id) => {
      collected.push(id);
      collected.push(...collectDescendantIds({ blockId: id, blocks }));
    });
  });
  return collected;
};

export const insertBlock = ({
  document,
  parentId,
  slotId,
  block,
  index
}: {
  document: WorkflowDocument;
  parentId: string;
  slotId: string;
  block: BlockInstance;
  index?: number;
}): WorkflowDocument => {
  const parent = document.blocks[parentId];
  if (!parent) {
    throw new Error(`Parent block not found: ${parentId}`);
  }

  const slot = parent.children[slotId];
  if (!slot) {
    throw new Error(`Slot "${slotId}" not found on block ${parentId}`);
  }

  const insertionIndex = index !== undefined ? index : slot.length;
  if (insertionIndex < 0 || insertionIndex > slot.length) {
    throw new Error(`Invalid insertion index ${insertionIndex} for slot size ${slot.length}`);
  }

  const nextSlot = [...slot];
  nextSlot.splice(insertionIndex, 0, block.id);

  const nextParent: BlockInstance = {
    ...parent,
    children: {
      ...parent.children,
      [slotId]: nextSlot
    }
  };

  return {
    ...document,
    blocks: {
      ...document.blocks,
      [block.id]: block,
      [parentId]: nextParent
    },
    metadata: {
      ...document.metadata,
      updatedAt: nowIso()
    }
  };
};

export const updateBlockData = ({
  document,
  blockId,
  updates
}: {
  document: WorkflowDocument;
  blockId: string;
  updates: Record<string, unknown>;
}): WorkflowDocument => {
  const block = document.blocks[blockId];
  if (!block) {
    throw new Error(`Block not found: ${blockId}`);
  }

  const nextBlock: BlockInstance = {
    ...block,
    data: {
      ...block.data,
      ...updates
    }
  };

  return {
    ...document,
    blocks: {
      ...document.blocks,
      [blockId]: nextBlock
    },
    metadata: {
      ...document.metadata,
      updatedAt: nowIso()
    }
  };
};

export const removeBlock = ({
  document,
  blockId,
  parentId,
  slotId
}: {
  document: WorkflowDocument;
  blockId: string;
  parentId: string;
  slotId: string;
}): WorkflowDocument => {
  if (blockId === document.root) {
    throw new Error("Cannot remove root block");
  }

  const parent = document.blocks[parentId];
  if (!parent) {
    throw new Error(`Parent block not found: ${parentId}`);
  }

  const slot = parent.children[slotId];
  if (!slot) {
    throw new Error(`Slot "${slotId}" not found on block ${parentId}`);
  }

  const index = slot.indexOf(blockId);
  if (index === -1) {
    throw new Error(`Block ${blockId} not found in slot ${slotId}`);
  }

  const descendantIds = collectDescendantIds({ blockId, blocks: document.blocks });
  const idsToRemove = new Set<string>([blockId, ...descendantIds]);

  const nextBlocks: Record<string, BlockInstance> = {};
  Object.entries(document.blocks).forEach(([id, existing]) => {
    if (!idsToRemove.has(id)) {
      nextBlocks[id] = existing;
    }
  });

  const nextSlot = slot.filter((id) => id !== blockId);
  const nextParent: BlockInstance = {
    ...parent,
    children: {
      ...parent.children,
      [slotId]: nextSlot
    }
  };

  nextBlocks[parentId] = nextParent;

  const nextConnections = document.connections.filter((connection) => {
    const fromInRemoved = idsToRemove.has(connection.from.blockId);
    const toInRemoved = idsToRemove.has(connection.to.blockId);
    return !fromInRemoved && !toInRemoved;
  });

  return {
    ...document,
    blocks: nextBlocks,
    connections: nextConnections,
    metadata: {
      ...document.metadata,
      updatedAt: nowIso()
    }
  };
};

export const reorderChild = ({
  document,
  parentId,
  slotId,
  fromIndex,
  toIndex
}: {
  document: WorkflowDocument;
  parentId: string;
  slotId: string;
  fromIndex: number;
  toIndex: number;
}): WorkflowDocument => {
  const parent = document.blocks[parentId];
  if (!parent) {
    throw new Error(`Parent block not found: ${parentId}`);
  }

  const slot = parent.children[slotId];
  if (!slot) {
    throw new Error(`Slot "${slotId}" not found on block ${parentId}`);
  }

  if (fromIndex < 0 || fromIndex >= slot.length) {
    throw new Error(`Invalid fromIndex ${fromIndex} for slot length ${slot.length}`);
  }

  const boundedToIndex = Math.max(0, Math.min(toIndex, slot.length - 1));
  const nextSlot = [...slot];
  const [moved] = nextSlot.splice(fromIndex, 1);
  nextSlot.splice(boundedToIndex, 0, moved);

  const nextParent: BlockInstance = {
    ...parent,
    children: {
      ...parent.children,
      [slotId]: nextSlot
    }
  };

  return {
    ...document,
    blocks: {
      ...document.blocks,
      [parentId]: nextParent
    },
    metadata: {
      ...document.metadata,
      updatedAt: nowIso()
    }
  };
};
