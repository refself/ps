import clsx from "clsx";
import { useDrop } from "react-dnd";

import { DND_ITEM_TYPES, type BlockDragItem } from "../../dnd/item-types";
import { useEditorStore } from "../../state/editor-store";

export type SlotDropZoneProps = {
  parentId: string;
  slotId: string;
  index: number;
  depth: number;
  label?: string;
  isEmpty?: boolean;
};

const SlotDropZone = ({ parentId, slotId, index, depth, label, isEmpty }: SlotDropZoneProps) => {
  const hasContent = !isEmpty;
  const addBlock = useEditorStore((state) => state.addBlock);
  const moveBlock = useEditorStore((state) => state.moveBlock);

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: DND_ITEM_TYPES.BLOCK,
    drop: (item: BlockDragItem) => {
      if (item.source === "palette") {
        addBlock({ kind: item.kind, parentId, slotId, index });
        return;
      }
      moveBlock({ blockId: item.blockId, targetParentId: parentId, slotId, index });
    },
    canDrop: () => true,
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop()
    })
  });

  return (
    <div
      ref={drop}
      className={clsx(
        "relative transition",
        hasContent
          ? "mx-1 h-2 rounded-full border border-dashed border-slate-800 bg-transparent"
          : "rounded-xl border border-dashed border-slate-800 bg-slate-900/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400",
        canDrop
          ? hasContent
            ? "border-blue-500/70 bg-blue-900/40"
            : "border-blue-500/70 bg-blue-950/40 text-blue-200"
          : hasContent
          ? "border-slate-800"
          : "border-slate-800 bg-slate-900/70",
        isOver && canDrop ? "shadow-inner shadow-blue-900/70" : "",
        isEmpty ? "text-slate-500" : ""
      )}
      style={{ marginLeft: depth * 28 }}
    >
      {hasContent ? (
        <span
          className={clsx(
            "absolute -top-5 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-[0.25em] text-slate-300 shadow-sm transition",
            isOver ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
          )}
        >
          {label ?? "Insert"}
        </span>
      ) : (
        label
      )}
    </div>
  );
};

export default SlotDropZone;
