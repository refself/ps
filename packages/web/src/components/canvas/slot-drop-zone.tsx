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
          ? "mx-1 h-1.5 rounded-full border border-dashed border-[#0A1A2333] bg-transparent"
          : "rounded-lg border border-dashed border-[#0A1A2333] bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#657782] backdrop-blur",
        canDrop
          ? hasContent
            ? "border-[#3A5AE5] bg-[#3A5AE520]"
            : "border-[#3A5AE5] bg-[#3A5AE510] text-[#3A5AE5]"
          : hasContent
          ? "border-[#0A1A2333]"
          : "border-[#0A1A2333] bg-white/80",
        isOver && canDrop ? "shadow-[0_0_0_3px_rgba(58,90,229,0.25)]" : "",
        isEmpty ? "text-[#657782]" : ""
      )}
      style={{ marginLeft: depth * 16 }}
    >
      {hasContent ? (
        <span
          className={clsx(
            "absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[#3A5AE5] shadow-sm transition",
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
