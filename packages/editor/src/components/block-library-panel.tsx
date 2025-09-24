import { useMemo } from "react";
import { useDrag } from "react-dnd";

import { blockRegistry } from "@workflow-builder/core";
import type { BlockSchema } from "@workflow-builder/core";

import { useEditorStore } from "../state/editor-store";
import { DND_ITEM_TYPES, type BlockDragItem } from "../dnd/item-types";
import { Icon, type IconName } from "./icon";
import { editorTheme } from "../theme";

type BlockGroup = {
  category: string;
  icon: IconName;
  items: Array<{ kind: string; label: string; description?: string; icon: IconName }>;
};

type BlockPaletteItemProps = {
  item: { kind: string; label: string; description?: string; icon: IconName };
  onAdd: (kind: string) => void;
};

const categoryIcons: Record<string, IconName> = {
  program: "workflow",
  control: "branch",
  variables: "variable",
  functions: "function",
  expressions: "expression",
  automation: "gear",
  ai: "sparkles",
  utility: "wrench",
  io: "link",
  raw: "box"
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
      className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-sm transition hover:border-[var(--editor-color-action)] hover:shadow-[0_14px_28px_rgba(58,90,229,0.15)]"
      style={{
        opacity: isDragging ? 0.4 : 1,
        border: `1px solid ${editorTheme.colors.borderSubtle}`,
        background: editorTheme.gradients.box,
        color: editorTheme.colors.foreground,
        boxShadow: '0 10px 24px rgba(10, 26, 35, 0.08)',
      }}
    >
      <span
        className="mt-1 flex h-7 w-7 items-center justify-center rounded-lg"
        style={{
          background: editorTheme.colors.actionBox,
          color: editorTheme.colors.action,
        }}
      >
        <Icon name={item.icon} className="h-4 w-4" />
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <span className="font-semibold">{item.label}</span>
        {item.description ? <span className="text-xs" style={{ color: editorTheme.colors.shaded }}>{item.description}</span> : null}
      </div>
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
            icon: categoryIcons[schema.category] ?? "workflow",
            items: []
          });
        }
        const icon = (schema.icon as IconName | undefined) ?? categoryIcons[schema.category] ?? "workflow";
        byCategory.get(schema.category)?.items.push({
          kind: schema.kind,
          label: schema.label,
          description: schema.description,
          icon
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
    <aside
      className="workflow-editor-scrollable flex h-full w-72 flex-col backdrop-blur"
      style={{
        borderRight: `1px solid ${editorTheme.colors.borderSubtle}`,
        background: 'rgba(255, 255, 255, 0.82)',
      }}
    >
      <div
        className="px-4 py-4"
        style={{
          borderBottom: `1px solid ${editorTheme.colors.borderSubtle}`,
          background: 'rgba(255, 255, 255, 0.9)',
        }}
      >
        <h2
          className="text-sm font-semibold uppercase tracking-[0.35em]"
          style={{ color: editorTheme.colors.shaded }}
        >
          Blocks
        </h2>
      </div>
      <div className="mt-4 flex-1 space-y-5 overflow-y-auto px-4 pb-6">
        {groups.map((group) => (
          <section key={group.category} className="flex flex-col gap-2">
            <div className="flex items-center justify-between pr-1">
              <h3
                className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em]"
                style={{ color: editorTheme.colors.shaded }}
              >
                <Icon name={group.icon} className="h-4 w-4" />
                {group.category}
              </h3>
              <span
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{
                  border: `1px solid ${editorTheme.colors.borderMuted}`,
                  background: 'rgba(255,255,255,0.9)',
                  color: editorTheme.colors.shaded,
                }}
              >
                {group.items.length}
              </span>
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
