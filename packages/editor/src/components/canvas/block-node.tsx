import clsx from "clsx";
import { useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import { useDrag } from "react-dnd";

import { blockRegistry } from "@workflow-builder/core";

import { DND_ITEM_TYPES } from "../../dnd/item-types";
import { useEditorStore } from "../../state/editor-store";
import SlotDropZone from "./slot-drop-zone";
import { getIdentifierStyle } from "../../utils/identifier-colors";
import { Icon } from "../icon";
import { editorTheme, getCategoryAccent } from "../../theme";
import { withAlpha } from "../../utils/color";

const categoryIcons: Record<string, string> = {
  program: "📜",
  control: "🔁",
  variables: "🔣",
  functions: "🧩",
  expressions: "🧮",
  ai: "✨",
  automation: "⚙️",
  utility: "🛠",
  io: "🔗",
  raw: "📦"
};

export type BlockNodeProps = {
  blockId: string;
  depth: number;
};

const BlockNode = ({ blockId, depth }: BlockNodeProps) => {
  const block = useEditorStore((state) => state.document.blocks[blockId]);
  const selectBlock = useEditorStore((state) => state.selectBlock);
  const deleteBlock = useEditorStore((state) => state.deleteBlock);
  const duplicateBlock = useEditorStore((state) => state.duplicateBlock);
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);

  const schema = useMemo(() => (block ? blockRegistry.get(block.kind) : null), [block]);
  const childSlots = schema?.childSlots ?? [];
  const [isHovered, setIsHovered] = useState(false);

  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: DND_ITEM_TYPES.BLOCK,
      item: { source: "canvas" as const, blockId },
      collect: (monitor) => ({
        isDragging: monitor.isDragging()
      })
    }),
    [blockId]
  );

  if (!block) {
    return null;
  }

  const category = schema?.category ?? "utility";
  const accentColor = getCategoryAccent(category);
  const iconBackground = withAlpha(accentColor, 0.12);
  const fields = schema?.fields ?? [];

  const identifierLabel =
    typeof block.data.identifier === "string" && block.data.identifier.trim() !== ""
      ? block.data.identifier.trim()
      : null;
  const cardClassName = clsx(
    "relative flex cursor-pointer flex-col gap-3 rounded-xl px-5 py-4 text-sm transition-[box-shadow,transform] duration-150",
    isDragging ? "opacity-60 scale-[0.99]" : "opacity-100"
  );

  const cardStyle: CSSProperties = {
    border: `1px solid ${editorTheme.colors.borderSubtle}`,
    background: editorTheme.surfaces.card,
    boxShadow: '0 18px 32px rgba(10,26,35,0.08)',
  };

  if (selectedBlockId === blockId) {
    cardStyle.boxShadow = `0 0 0 2px ${withAlpha(accentColor, 0.25)}, 0 28px 48px rgba(10,26,35,0.16)`;
  }

  if (isHovered) {
    cardStyle.boxShadow = selectedBlockId === blockId
      ? `0 0 0 2px ${withAlpha(accentColor, 0.38)}, 0 32px 52px rgba(10,26,35,0.18)`
      : `0 0 0 1px ${withAlpha(accentColor, 0.24)}, 0 24px 40px rgba(10,26,35,0.12)`;
    cardStyle.transform = "translateY(-2px)";
    cardStyle.zIndex = 5;
  }

  const handleSelect = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    selectBlock(blockId);
  };

  return (
    <div className="relative" style={{ marginLeft: depth * 18 }}>
      {depth > 0 ? (
        <span
          aria-hidden
          className="absolute top-5 bottom-5 w-px"
          style={{ background: editorTheme.colors.borderMuted, left: -12 }}
        />
      ) : null}
      <div
        ref={dragRef}
        className={cardClassName}
        style={cardStyle}
        onClick={handleSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
              style={{ background: iconBackground, color: accentColor, boxShadow: '0 12px 24px rgba(10,26,35,0.08)' }}
            >
              {categoryIcons[category] ?? "🧱"}
            </span>
            <div className="flex flex-col gap-1.5">
              <div className="text-[16px] font-semibold" style={{ color: editorTheme.colors.foreground }}>
                {schema?.label ?? block.kind}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    background: withAlpha(accentColor, 0.1),
                    color: accentColor,
                    border: `1px solid ${withAlpha(accentColor, 0.25)}`,
                  }}
                >
                  {block.kind}
                </span>
                {identifierLabel ? (
                  (() => {
                    const style = getIdentifierStyle(identifierLabel);
                    return (
                      <span
                        className={clsx(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          style.chipClassName
                        )}
                        style={style.chipStyle}
                      >
                        Stores {identifierLabel}
                      </span>
                    );
                  })()
                ) : null}
              </div>
              {schema?.description ? (
                <p className="text-[12px]" style={{ color: editorTheme.colors.shaded }}>
                  {schema.description}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-1.5" style={{ color: editorTheme.colors.shaded }}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                duplicateBlock(blockId);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full transition"
              style={{
                border: `1px solid ${editorTheme.colors.borderSubtle}`,
                background: editorTheme.surfaces.card,
                color: editorTheme.colors.shaded,
              }}
              aria-label="Duplicate block"
            >
              <Icon name="copy" className="h-3.5 w-3.5" title="Duplicate" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                deleteBlock(blockId);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full transition"
              style={{
                border: `1px solid ${withAlpha(editorTheme.colors.negative, 0.5)}`,
                background: editorTheme.surfaces.card,
                color: editorTheme.colors.negative,
              }}
              aria-label="Delete block"
            >
              <Icon name="trash" className="h-3.5 w-3.5" title="Delete" />
            </button>
          </div>
        </header>

        {fields.length > 0 ? (
          <dl className="grid grid-cols-1 gap-1 text-[12px]" style={{ color: editorTheme.colors.shaded }}>
            {fields.slice(0, 3).map((field) => {
              const rawValue = block.data[field.id];
              const value =
                typeof rawValue === "string"
                  ? rawValue
                  : typeof rawValue === "boolean"
                  ? String(rawValue)
                  : rawValue === undefined && field.defaultValue !== undefined
                  ? String(field.defaultValue)
                  : rawValue
                  ? JSON.stringify(rawValue)
                  : "—";
              return (
                <div key={field.id} className="flex items-center gap-2 overflow-hidden">
                  <dt className="shrink-0 text-[11px] uppercase tracking-wide" style={{ color: editorTheme.colors.accentMuted }}>
                    {field.label}
                  </dt>
                  <dd className="truncate" title={String(value)}>
                    {String(value)}
                  </dd>
                </div>
              );
            })}
            {fields.length > 3 ? (
              <div className="text-[11px] uppercase tracking-wide" style={{ color: editorTheme.colors.accentMuted }}>
                +{fields.length - 3} more
              </div>
            ) : null}
          </dl>
        ) : null}

        {childSlots.length > 0 ? (
          <div className="flex flex-col gap-2">
            {childSlots.map((slot) => {
              const childIds = block.children[slot.id] ?? [];
              return (
                <div
                  key={slot.id}
                  className="rounded-xl p-2.5"
                  style={{
                    border: `1px dashed ${editorTheme.colors.borderMuted}`,
                    background: editorTheme.colors.backgroundSoft,
                  }}
                >
                  <div
                    className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: editorTheme.colors.shaded }}
                  >
                    <span>{slot.label}</span>
                    <span style={{ color: editorTheme.colors.accentMuted }}>{childIds.length}</span>
                  </div>
                  <div className="mt-2 flex flex-col gap-2">
                    <SlotDropZone
                      parentId={blockId}
                      slotId={slot.id}
                      index={0}
                      depth={depth + 1}
                      label={childIds.length === 0 ? "Drop a block here" : "Insert at start"}
                      isEmpty={childIds.length === 0}
                    />
                    {childIds.map((childId, childIndex) => (
                      <div key={childId} className="flex flex-col gap-2">
                        <BlockNode blockId={childId} depth={depth + 1} />
                        <SlotDropZone
                          parentId={blockId}
                          slotId={slot.id}
                          index={childIndex + 1}
                          depth={depth + 1}
                          label="Insert here"
                          isEmpty={false}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BlockNode;
