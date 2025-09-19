import clsx from "clsx";
import { useMemo } from "react";
import { useDrag } from "react-dnd";

import { blockRegistry } from "@workflow-builder/core";

import { DND_ITEM_TYPES } from "../../dnd/item-types";
import { useEditorStore } from "../../state/editor-store";
import BlockFieldEditor from "./block-field-editor";
import SlotDropZone from "./slot-drop-zone";
import { getIdentifierStyle } from "../../utils/identifier-colors";

const categoryStyles: Record<
  string,
  {
    card: string;
    icon: string;
    iconBackground: string;
    badge: string;
  }
> = {
  program: {
    card: "border border-slate-600/40 bg-gradient-to-br from-slate-800/70 via-slate-900/80 to-slate-950/90",
    icon: "📜",
    iconBackground: "bg-slate-500/30 text-slate-100",
    badge: "bg-slate-500/20 text-slate-100"
  },
  control: {
    card: "border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-700/25 via-fuchsia-900/60 to-slate-950/90",
    icon: "🔁",
    iconBackground: "bg-fuchsia-500/30 text-fuchsia-100",
    badge: "bg-fuchsia-500/25 text-fuchsia-100"
  },
  variables: {
    card: "border border-amber-500/30 bg-gradient-to-br from-amber-600/25 via-amber-900/50 to-slate-950/90",
    icon: "🔣",
    iconBackground: "bg-amber-500/30 text-amber-100",
    badge: "bg-amber-500/25 text-amber-100"
  },
  functions: {
    card: "border border-emerald-500/30 bg-gradient-to-br from-emerald-600/25 via-emerald-900/60 to-slate-950/90",
    icon: "🧩",
    iconBackground: "bg-emerald-500/30 text-emerald-100",
    badge: "bg-emerald-500/25 text-emerald-100"
  },
  expressions: {
    card: "border border-sky-500/30 bg-gradient-to-br from-sky-600/25 via-sky-900/60 to-slate-950/90",
    icon: "🧮",
    iconBackground: "bg-sky-500/30 text-sky-100",
    badge: "bg-sky-500/25 text-sky-100"
  },
  ai: {
    card: "border border-pink-500/30 bg-gradient-to-br from-pink-500/25 via-pink-900/60 to-slate-950/90",
    icon: "✨",
    iconBackground: "bg-pink-500/30 text-pink-100",
    badge: "bg-pink-500/25 text-pink-100"
  },
  automation: {
    card: "border border-orange-500/30 bg-gradient-to-br from-orange-600/25 via-orange-900/55 to-slate-950/90",
    icon: "⚙️",
    iconBackground: "bg-orange-500/30 text-orange-100",
    badge: "bg-orange-500/25 text-orange-100"
  },
  utility: {
    card: "border border-cyan-500/30 bg-gradient-to-br from-cyan-600/25 via-cyan-900/55 to-slate-950/90",
    icon: "🛠",
    iconBackground: "bg-cyan-500/30 text-cyan-100",
    badge: "bg-cyan-500/25 text-cyan-100"
  },
  io: {
    card: "border border-lime-500/30 bg-gradient-to-br from-lime-600/25 via-lime-900/55 to-slate-950/90",
    icon: "🔗",
    iconBackground: "bg-lime-500/30 text-lime-100",
    badge: "bg-lime-500/25 text-lime-100"
  },
  raw: {
    card: "border border-red-500/30 bg-gradient-to-br from-red-600/25 via-red-900/60 to-slate-950/90",
    icon: "📦",
    iconBackground: "bg-red-500/30 text-red-100",
    badge: "bg-red-500/25 text-red-100"
  }
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
  const updateBlockFields = useEditorStore((state) => state.updateBlockFields);

  const schema = useMemo(() => (block ? blockRegistry.get(block.kind) : null), [block]);
  const childSlots = schema?.childSlots ?? [];

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
  const colors = categoryStyles[category] ?? categoryStyles.utility;
  const fields = schema?.fields ?? [];

  const identifierLabel =
    typeof block.data.identifier === "string" && block.data.identifier.trim() !== ""
      ? block.data.identifier.trim()
      : null;
  const cardClassName = clsx(
    "flex flex-col gap-3 rounded-2xl px-4 py-3 text-sm shadow-[0_18px_45px_-28px_rgba(0,0,0,0.85)] transition-all backdrop-blur",
    colors.card,
    selectedBlockId === blockId ? "ring-2 ring-sky-400/70 shadow-sky-500/20" : "ring-0",
    isDragging ? "opacity-60 scale-[0.99]" : "opacity-100"
  );

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div ref={dragRef} className={cardClassName} onClick={() => selectBlock(blockId)}>
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-xl text-lg",
                colors.iconBackground
              )}
            >
              {colors.icon}
            </span>
            <div className="flex flex-col gap-1.5">
              <div className="text-[15px] font-semibold text-slate-50">{schema?.label ?? block.kind}</div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={clsx("rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", colors.badge)}>
                  {block.kind}
                </span>
                {identifierLabel ? (
                  (() => {
                    const style = getIdentifierStyle(identifierLabel);
                    return (
                      <span
                        className={clsx(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          style.chip,
                          style.text
                        )}
                      >
                        Stores {identifierLabel}
                      </span>
                    );
                  })()
                ) : null}
              </div>
              {schema?.description ? (
                <p className="text-[11px] text-slate-200/70">{schema.description}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                duplicateBlock(blockId);
              }}
              className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-50 transition hover:border-emerald-400/60 hover:bg-emerald-500/25 hover:text-emerald-100"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                deleteBlock(blockId);
              }}
              className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-50 transition hover:border-red-400/60 hover:bg-red-500/25 hover:text-red-100"
            >
              Delete
            </button>
          </div>
        </header>

        {fields.length > 0 ? (
          <div className="flex flex-col gap-3">
            {fields.map((field) => (
              <BlockFieldEditor
                key={field.id}
                field={field}
                value={block.data[field.id] ?? field.defaultValue ?? ""}
                onChange={(nextValue) => updateBlockFields(blockId, { [field.id]: nextValue })}
                blockId={blockId}
              />
            ))}
          </div>
        ) : null}

        {childSlots.length > 0 ? (
          <div className="flex flex-col gap-3">
            {childSlots.map((slot) => {
              const childIds = block.children[slot.id] ?? [];
              return (
                <div key={slot.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-white/70">
                    <span>{slot.label}</span>
                    <span className="text-white/40">{childIds.length} block{childIds.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="mt-2 flex flex-col gap-2.5">
                    <SlotDropZone
                      parentId={blockId}
                      slotId={slot.id}
                      index={0}
                      depth={depth + 1}
                      label={childIds.length === 0 ? "Drop a block here" : "Insert at start"}
                      isEmpty={childIds.length === 0}
                    />
                    {childIds.map((childId, childIndex) => (
                      <div key={childId} className="flex flex-col gap-2.5">
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
