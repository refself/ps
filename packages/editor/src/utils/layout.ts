import type { WorkflowDocument } from "@workflows/core";

export const NODE_WIDTH = 320;
export const NODE_HEIGHT = 170;
const HORIZONTAL_GAP = 120;
const VERTICAL_GAP = 60;

export type BlockPositions = Record<string, { x: number; y: number; depth: number }>;

export const computeBlockPositions = (document: WorkflowDocument): BlockPositions => {
  const positions: BlockPositions = {};
  let currentY = 0;

  const traverse = (blockId: string, depth: number) => {
    positions[blockId] = {
      x: depth * (NODE_WIDTH + HORIZONTAL_GAP),
      y: currentY * (NODE_HEIGHT + VERTICAL_GAP),
      depth
    };
    currentY += 1;

    const block = document.blocks[blockId];
    if (!block) {
      return;
    }

    Object.values(block.children).forEach((childIds) => {
      childIds.forEach((childId) => {
        traverse(childId, depth + 1);
      });
    });
  };

  const root = document.blocks[document.root];
  if (!root) {
    return positions;
  }

  const rootChildren = root.children.body ?? [];
  rootChildren.forEach((childId) => {
    traverse(childId, 0);
  });

  return positions;
};

export type Edge = {
  fromId: string;
  toId: string;
};

export const computeEdges = (document: WorkflowDocument, positions: BlockPositions): Edge[] => {
  const edges: Edge[] = [];

  Object.values(document.blocks).forEach((block) => {
    if (!block || !positions[block.id]) {
      return;
    }

    Object.values(block.children).forEach((childIds) => {
      childIds.forEach((childId) => {
        if (positions[childId]) {
          edges.push({ fromId: block.id, toId: childId });
        }
      });
    });
  });

  return edges;
};

export const measureCanvasSize = (positions: BlockPositions) => {
  let maxX = 0;
  let maxY = 0;

  Object.values(positions).forEach(({ x, y }) => {
    if (x > maxX) {
      maxX = x;
    }
    if (y > maxY) {
      maxY = y;
    }
  });

  return {
    width: maxX + NODE_WIDTH + HORIZONTAL_GAP,
    height: maxY + NODE_HEIGHT + VERTICAL_GAP
  };
};
