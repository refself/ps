import clsx from "clsx";
import { useState } from "react";
import { useDrop } from "react-dnd";

import { DND_ITEM_TYPES, type BlockDragItem } from "../../dnd/item-types";
import { useEditorStore } from "../../state/editor-store";
import { usePaletteStore } from "../../state/palette-store";
import { Icon } from "../icon";

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
  const openPalette = usePaletteStore((state) => state.openPalette);

  const [{ isOver, canDrop, isDragging }, drop] = useDrop({
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
      canDrop: monitor.canDrop(),
      isDragging: Boolean(monitor.getItemType())
    })
  });

  const [pointerInside, setPointerInside] = useState(false);

  const showZone = isEmpty || isOver || pointerInside || (isDragging && !hasContent);
  const isActive = isOver && canDrop;
  const showAddHint = hasContent && (pointerInside || isActive);

  return (
    <div
      ref={drop}
      className={clsx(
        "relative flex items-center justify-center transition-all duration-150 ease-out",
        hasContent
          ? showZone
            ? "mx-1 py-5"
            : "mx-1 py-1"
          : "rounded-lg border border-dashed border-[#0A1A2333] bg-white/80 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#657782] backdrop-blur",
        showZone || !hasContent ? "opacity-100" : "opacity-0",
        canDrop
          ? hasContent
            ? ""
            : "border-[#3A5AE5] bg-[#3A5AE510] text-[#3A5AE5]"
          : hasContent
          ? ""
          : "border-[#0A1A2333] bg-white/80",
        isActive ? "shadow-[0_0_0_3px_rgba(58,90,229,0.25)]" : "shadow-none",
        isEmpty ? "text-[#657782]" : ""
      )}
      style={{ marginLeft: depth * 16 }}
      onMouseEnter={() => setPointerInside(true)}
      onMouseLeave={() => setPointerInside(false)}
      onClick={(event) => {
        event.stopPropagation();
        openPalette({ parentId, slotId, index });
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPalette({ parentId, slotId, index });
        }
      }}
      role="button"
      tabIndex={0}
    >
      {hasContent ? (
        <>
          <div
            className={clsx(
              "h-2 w-full transform rounded-full border border-dashed transition-all duration-150",
              canDrop ? "border-[#3A5AE5] bg-[#3A5AE520]" : "border-[#0A1A2333] bg-transparent",
              showZone ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
            )}
          />
          {showAddHint ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#3A5AE5] bg-white text-[#3A5AE5] shadow-[0_6px_14px_rgba(58,90,229,0.18)]">
                <Icon name="plus" className="h-4 w-4" />
              </span>
              <span className="rounded-full bg-white/95 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3A5AE5] shadow-sm">
                {label ?? "Insert"}
              </span>
            </div>
          ) : null}
        </>
      ) : (
        label
      )}
    </div>
  );
};

export default SlotDropZone;
