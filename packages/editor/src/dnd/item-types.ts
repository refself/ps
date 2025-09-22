export const DND_ITEM_TYPES = {
  BLOCK: "block"
} as const;

export type PaletteDragItem = {
  source: "palette";
  kind: string;
};

export type CanvasDragItem = {
  source: "canvas";
  blockId: string;
};

export type BlockDragItem = PaletteDragItem | CanvasDragItem;
