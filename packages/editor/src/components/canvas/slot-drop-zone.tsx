import clsx from "clsx";
import { useState } from "react";
import { useDrop } from "react-dnd";

import { DND_ITEM_TYPES, type BlockDragItem } from "../../dnd/item-types";
import { useEditorStore } from "../../state/editor-store";
import { usePaletteStore } from "../../state/palette-store";
import { Icon } from "../icon";
import { editorTheme } from "../../theme";
import { withAlpha } from "../../utils/color";

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

  const baseBorder = editorTheme.colors.borderSubtle;
  const accent = editorTheme.colors.action;
  const emptyBackground = 'rgba(255,255,255,0.82)';

  return (
    <div
      ref={drop}
      className={clsx(
        "relative flex items-center justify-center transition-all duration-150 ease-out",
        hasContent
          ? showZone
            ? "mx-1 py-5"
            : "mx-1 py-1"
          : "rounded-lg border border-dashed px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] backdrop-blur",
        showZone || !hasContent ? "opacity-100" : "opacity-0"
      )}
      style={{
        marginLeft: depth * 16,
        borderColor: hasContent ? 'transparent' : baseBorder,
        background: hasContent ? 'transparent' : emptyBackground,
        color: editorTheme.colors.shaded,
        boxShadow: isActive ? `0 0 0 3px ${withAlpha(accent, 0.25)}` : 'none',
      }}
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
            className="h-2 w-full transform rounded-full border border-dashed transition-all duration-150"
            style={{
              borderColor: canDrop ? withAlpha(accent, 0.6) : baseBorder,
              background: canDrop ? withAlpha(accent, 0.16) : 'transparent',
              opacity: showZone ? 1 : 0,
              transform: showZone ? 'scaleY(1)' : 'scaleY(0)',
            }}
          />
          {showAddHint ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full shadow-[0_6px_14px_rgba(58,90,229,0.18)]"
                style={{
                  border: `1px solid ${accent}`,
                  background: 'rgba(255,255,255,0.95)',
                  color: accent,
                }}
              >
                <Icon name="plus" className="h-4 w-4" />
              </span>
              <span
                className="rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] shadow-sm"
                style={{ background: 'rgba(255,255,255,0.95)', color: accent }}
              >
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
