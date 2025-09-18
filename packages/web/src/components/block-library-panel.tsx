import { useMemo } from "react";
import { useDrag } from "react-dnd";

import { blockRegistry } from "@workflow-builder/core";
import type { BlockSchema } from "@workflow-builder/core";

import { useEditorStore } from "../state/editor-store";
import { DND_ITEM_TYPES, type BlockDragItem } from "../dnd/item-types";

type BlockGroup = {
  category: string;
  items: Array<{ kind: string; label: string; description?: string }>;
};

type BlockPaletteItemProps = {
  item: { kind: string; label: string; description?: string };
  onAdd: (kind: string) => void;
};

const categoryIcons: Record<string, string> = {
  program: "📜",
  control: "🔁",
  variables: "🔣",
  functions: "🧩",
  expressions: "🧮",
  automation: "⚙️",
  ai: "✨",
  utility: "🛠",
  io: "🔗",
  raw: "📦"
};

const BlockPaletteItem = ({ item, onAdd }: BlockPaletteItemProps) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DND_ITEM_TYPES.BLOCK,
    item: { source: "palette" as const, kind: item.kind } satisfies BlockDragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  return (
    <button
      ref={drag}
      type="button"
      onClick={() => onAdd(item.kind)}
      className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-left text-sm text-slate-100 transition hover:border-blue-500 hover:bg-slate-900 hover:shadow-lg hover:shadow-blue-500/20"
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <span className="font-medium">{item.label}</span>
      {item.description ? <span className="text-xs text-slate-400">{item.description}</span> : null}
    </button>
  );
};

const categoryLabels: Record<string, string> = {
  program: "Program",
  structure: "Structure",
  control: "Control",
  variables: "Variables",
  functions: "Functions",
  expressions: "Expressions",
  io: "I/O",
  ai: "AI",
  automation: "Automation",
  utility: "Utility",
  raw: "Raw"
};

const BlockLibraryPanel = () => {
  const rootId = useEditorStore((state) => state.document.root);
  const addBlock = useEditorStore((state) => state.addBlock);

  const groups = useMemo<BlockGroup[]>(() => {
    const byCategory = new Map<string, BlockGroup>();
    blockRegistry
      .list()
      .filter((schema: BlockSchema) => schema.kind !== "program")
      .forEach((schema: BlockSchema) => {
        const label = categoryLabels[schema.category] ?? schema.category;
        if (!byCategory.has(schema.category)) {
          byCategory.set(schema.category, {
            category: label,
            items: []
          });
        }
        byCategory.get(schema.category)?.items.push({
          kind: schema.kind,
          label: schema.label,
          description: schema.description
        });
      });

    return Array.from(byCategory.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, []);

  const handleAdd = (kind: string) => {
    addBlock({
      kind,
      parentId: rootId,
      slotId: "body"
    });
  };

  return (
    <aside className="flex h-full w-72 flex-col border-r border-slate-800 bg-slate-950/70">
      <div className="border-b border-slate-800 bg-slate-950/80 px-4 py-3 shadow-inner shadow-slate-900/50">
        <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">Blocks</h2>
      </div>
      <div className="mt-4 flex-1 space-y-5 overflow-y-auto px-4 pb-6">
        {groups.map((group) => (
          <section key={group.category} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                <span>{categoryIcons[group.category.toLowerCase()] ?? "🧱"}</span>
                {group.category}
              </h3>
              <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-400">{group.items.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {group.items.map((item) => (
                <BlockPaletteItem key={item.kind} item={item} onAdd={handleAdd} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
};

export default BlockLibraryPanel;
