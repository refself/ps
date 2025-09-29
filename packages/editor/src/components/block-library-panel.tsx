import { useMemo, useState } from "react";
import { useDrag } from "react-dnd";

import { blockRegistry } from "@workflows/core";
import type { BlockSchema } from "@workflows/core";

import { useEditorStore } from "../state/editor-store";
import { DND_ITEM_TYPES, type BlockDragItem } from "../dnd/item-types";
import { Icon, type IconName } from "./icon";
import { editorTheme } from "../theme";
import BlockLibraryDocsModal from "./block-library-docs-modal";

type BlockGroup = {
  key: string;
  label: string;
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
  const { groups, categoryOptions } = useMemo(() => {
    const byCategory = new Map<string, BlockGroup>();

    blockRegistry
      .list()
      .filter((schema: BlockSchema) => schema.kind !== "program")
      .forEach((schema: BlockSchema) => {
        const key = schema.category;
        const label = categoryLabels[key] ?? key;
        if (!byCategory.has(key)) {
          byCategory.set(key, {
            key,
            label,
            icon: categoryIcons[key] ?? "workflow",
            items: []
          });
        }
        const icon = (schema.icon as IconName | undefined) ?? categoryIcons[key] ?? "workflow";
        byCategory.get(key)?.items.push({
          kind: schema.kind,
          label: schema.label,
          description: schema.description,
          icon
        });
      });

    const grouped = Array.from(byCategory.values()).sort((a, b) => a.label.localeCompare(b.label));
    const categories = grouped.map(({ key, label }) => ({ key, label }));

    return { groups: grouped, categoryOptions: categories };
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [docsOpen, setDocsOpen] = useState(false);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const isCategoryActive = (categoryKey: string) => selectedCategories.size === 0 || selectedCategories.has(categoryKey);

  const toggleCategory = (categoryKey: string) => {
    setSelectedCategories((current) => {
      const next = new Set(current);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategories(new Set());
  };

  const filteredGroups = useMemo(() => {
    return groups
      .map((group) => {
        if (!isCategoryActive(group.key)) {
          return { ...group, items: [] };
        }

        if (!normalizedSearch) {
          return group;
        }

        const items = group.items.filter((item) => {
          const haystack = `${item.label} ${item.description ?? ""} ${item.kind}`.toLowerCase();
          return haystack.includes(normalizedSearch);
        });
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [groups, normalizedSearch, selectedCategories]);

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
        className="flex items-center justify-between gap-2 px-4 py-4"
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
        <button
          type="button"
          onClick={() => setDocsOpen(true)}
          className="flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition"
          style={{
            borderColor: editorTheme.colors.borderSubtle,
            background: editorTheme.colors.backgroundSoft,
            color: editorTheme.colors.shaded,
          }}
        >
          <Icon name="workflow" className="h-3.5 w-3.5" />
          Docs
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-3">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search blocks"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{
                borderColor: editorTheme.colors.borderSubtle,
                background: editorTheme.colors.backgroundSoft,
                color: editorTheme.colors.foreground,
                boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.12)",
              }}
            />
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map(({ key, label }) => {
                const active = isCategoryActive(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleCategory(key)}
                    className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition"
                    style={{
                      border: `1px solid ${active ? editorTheme.colors.action : editorTheme.colors.borderSubtle}`,
                      background: active ? editorTheme.colors.actionBox : editorTheme.colors.backgroundSoft,
                      color: active ? editorTheme.colors.action : editorTheme.colors.shaded,
                    }}
                    aria-pressed={active}
                  >
                    {label}
                  </button>
                );
              })}
              {(selectedCategories.size > 0 || normalizedSearch) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                  style={{
                    border: `1px solid ${editorTheme.colors.action}`,
                    background: editorTheme.colors.actionBox,
                    color: editorTheme.colors.action,
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {filteredGroups.map((group) => (
              <section key={group.key} className="flex flex-col gap-2">
                <div className="flex items-center justify-between pr-1">
                  <h3
                    className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em]"
                    style={{ color: editorTheme.colors.shaded }}
                  >
                    <Icon name={group.icon} className="h-4 w-4" />
                    {group.label}
                  </h3>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px]"
                    style={{
                      border: `1px solid ${editorTheme.colors.borderMuted}`,
                      background: "rgba(255,255,255,0.9)",
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

            {filteredGroups.length === 0 && (
              <div
                className="flex flex-col items-center gap-2 rounded-xl px-4 py-6 text-center text-xs"
                style={{
                  border: `1px dashed ${editorTheme.colors.borderMuted}`,
                  background: editorTheme.colors.backgroundSoft,
                  color: editorTheme.colors.shaded,
                }}
              >
                <Icon name="search" className="h-5 w-5" />
                <span>No blocks match the current filters.</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <BlockLibraryDocsModal open={docsOpen} onClose={() => setDocsOpen(false)} />
    </aside>
  );
};

export default BlockLibraryPanel;
