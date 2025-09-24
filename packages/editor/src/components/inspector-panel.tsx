import { useMemo } from "react";

import { blockRegistry } from "@workflow-builder/core";

import { useEditorStore } from "../state/editor-store";
import { editorTheme } from "../theme";
import { withAlpha } from "../utils/color";
import FieldEditor from "./inspector/field-editor";
import { Icon, type IconName } from "./icon";

const categoryIcons: Record<string, IconName> = {
  program: "workflow",
  structure: "branch",
  control: "branch",
  variables: "variable",
  functions: "function",
  expressions: "expression",
  ai: "sparkles",
  automation: "gear",
  utility: "wrench",
  io: "link",
  raw: "box"
};

const categoryColors: Record<string, string> = {
  program: editorTheme.category.program,
  control: editorTheme.category.control,
  structure: editorTheme.category.control,
  variables: editorTheme.category.variables,
  functions: editorTheme.category.functions,
  expressions: editorTheme.category.expressions,
  ai: editorTheme.category.ai,
  automation: editorTheme.category.automation,
  utility: editorTheme.category.utility,
  io: editorTheme.category.io,
  raw: editorTheme.category.raw,
};

const InspectorPanel = () => {
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
  const document = useEditorStore((state) => state.document);
  const updateBlockFields = useEditorStore((state) => state.updateBlockFields);
  const duplicateBlock = useEditorStore((state) => state.duplicateBlock);
  const deleteBlock = useEditorStore((state) => state.deleteBlock);
  const selectBlock = useEditorStore((state) => state.selectBlock);

  const effectiveSelectedId = selectedBlockId ?? document.root;

  type PathSegment = {
    blockId: string;
    slotLabel?: string;
  };

  const pathSegments = useMemo<PathSegment[]>(() => {
    const targetId = document.blocks[effectiveSelectedId] ? effectiveSelectedId : document.root;

    const dfs = (blockId: string, trail: PathSegment[]): PathSegment[] | null => {
      if (blockId === targetId) {
        return trail;
      }

      const block = document.blocks[blockId];
      if (!block) {
        return null;
      }

      const schema = blockRegistry.get(block.kind);
      const childSlots = schema?.childSlots ?? [];

      for (const slot of childSlots) {
        const childIds = block.children[slot.id] ?? [];
        for (const childId of childIds) {
          const nextTrail = [...trail, { blockId: childId, slotLabel: slot.label }];
          const result = dfs(childId, nextTrail);
          if (result) {
            return result;
          }
        }
      }

      return null;
    };

    const rootTrail: PathSegment[] = [{ blockId: document.root }];
    if (targetId === document.root) {
      return rootTrail;
    }

    const result = dfs(document.root, rootTrail);
    return result ?? rootTrail;
  }, [document, effectiveSelectedId]);

  if (!selectedBlockId) {
    return (
      <section
        className="flex h-full flex-1 flex-col border-b p-4 backdrop-blur"
        style={{
          borderColor: editorTheme.colors.borderSubtle,
          background: editorTheme.surfaces.glass,
        }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: editorTheme.colors.shaded }}>
          Inspector
        </h2>
        <p className="mt-4 text-sm" style={{ color: editorTheme.colors.shaded }}>
          Select a block to configure its properties.
        </p>
      </section>
    );
  }

  const block = document.blocks[selectedBlockId];
  if (!block) {
    return (
      <section
        className="flex h-full flex-1 flex-col border-b p-4 backdrop-blur"
        style={{
          borderColor: editorTheme.colors.borderSubtle,
          background: editorTheme.surfaces.glass,
        }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: editorTheme.colors.shaded }}>
          Inspector
        </h2>
        <p className="mt-4 text-sm" style={{ color: editorTheme.colors.negative }}>
          Selected block not found.
        </p>
      </section>
    );
  }

  const schema = blockRegistry.get(block.kind);
  const fields = schema?.fields ?? [];
  const outputs = schema?.outputs ?? [];
  const category = schema?.category ?? "utility";
  const accent = categoryColors[category] ?? editorTheme.colors.action;
  const iconName = categoryIcons[category] ?? "workflow";
  const isRoot = block.id === document.root;

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-y-auto backdrop-blur"
      style={{ background: editorTheme.surfaces.glass }}
    >
      <div
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: editorTheme.colors.borderSubtle, background: editorTheme.surfaces.card }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: withAlpha(accent, 0.12), color: accent }}
          >
            <Icon name={iconName} className="h-5 w-5" />
          </span>
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold" style={{ color: editorTheme.colors.foreground }}>
              {schema?.label ?? block.kind}
            </h2>
            <span className="text-[11px] uppercase tracking-[0.3em]" style={{ color: editorTheme.colors.shaded }}>
              {block.kind}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isRoot ? (
            <>
              <button
                type="button"
                onClick={() => duplicateBlock(block.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full border transition hover:border-[var(--editor-color-positive)] hover:text-[var(--editor-color-positive)]"
                style={{
                  borderColor: editorTheme.colors.borderStrong,
                  color: editorTheme.colors.foreground,
                  background: editorTheme.surfaces.card,
                }}
                title="Duplicate block"
                aria-label="Duplicate block"
              >
                <Icon name="copy" className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => deleteBlock(block.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full border transition hover:bg-[var(--editor-color-negative-box)]"
                style={{
                  borderColor: editorTheme.colors.negative,
                  color: editorTheme.colors.negative,
                  background: editorTheme.colors.backgroundDefault,
                }}
                title="Delete block"
                aria-label="Delete block"
              >
                <Icon name="trash" className="h-3.5 w-3.5" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      <nav
        className="flex flex-wrap items-center gap-2 border-b px-6 py-2 text-[11px]"
        style={{
          borderColor: editorTheme.colors.borderSubtle,
          background: editorTheme.surfaces.card,
          color: editorTheme.colors.shaded,
        }}
      >
        {pathSegments.map((segment, index) => {
          const blockInstance = document.blocks[segment.blockId];
          const segmentSchema = blockInstance ? blockRegistry.get(blockInstance.kind) : null;
          const label = segmentSchema?.label ?? blockInstance?.kind ?? segment.blockId;
          const isCurrent = segment.blockId === effectiveSelectedId;

          return (
            <div key={segment.blockId} className="flex items-center gap-2">
              {index > 0 ? <span style={{ color: editorTheme.colors.borderMuted }}>/</span> : null}
              {segment.slotLabel ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    background: editorTheme.colors.backgroundTint,
                    color: editorTheme.colors.action,
                  }}
                >
                  {segment.slotLabel}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => selectBlock(segment.blockId)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  isCurrent ? "bg-[var(--editor-color-action)] text-white" : "hover:bg-[var(--editor-color-background-tint)]"
                }`}
                style={{
                  backgroundColor: isCurrent ? editorTheme.colors.action : editorTheme.colors.backgroundDefault,
                  color: isCurrent ? "white" : editorTheme.colors.foreground,
                }}
              >
                {label}
              </button>
            </div>
          );
        })}
      </nav>

      {schema?.description ? (
        <div
          className="border-b px-6 py-3 text-[12px]"
          style={{
            borderColor: editorTheme.colors.borderSubtle,
            background: editorTheme.surfaces.card,
            color: editorTheme.colors.shaded,
          }}
        >
          {schema.description}
        </div>
      ) : null}

      {outputs.length > 0 ? (
        <div
          className="flex flex-col gap-2 border-b px-6 py-3"
          style={{ borderColor: editorTheme.colors.borderSubtle, background: editorTheme.surfaces.glass }}
        >
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: editorTheme.colors.accentMuted }}>
            Outputs
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {outputs.map((output) => (
              <div
                key={output.id}
                className="flex min-w-[120px] flex-col gap-0.5 rounded-md border px-2 py-1"
                style={{
                  borderColor: editorTheme.colors.borderSubtle,
                  background: editorTheme.surfaces.card,
                }}
              >
                <span className="text-xs font-semibold" style={{ color: editorTheme.colors.foreground }}>
                  {output.label}
                </span>
                {output.description ? (
                  <span className="text-[10px]" style={{ color: editorTheme.colors.shaded }}>
                    {output.description}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-8 pt-6">
        {fields.length === 0 ? (
          <p className="text-sm" style={{ color: editorTheme.colors.shaded }}>
            This block has no configurable fields.
          </p>
        ) : (
          fields.map((field) => (
            <FieldEditor
              key={field.id}
              field={field}
              value={block.data[field.id] ?? field.defaultValue ?? ""}
              onChange={(nextValue) => updateBlockFields(selectedBlockId, { [field.id]: nextValue })}
              contextBlockId={selectedBlockId}
            />
          ))
        )}
      </div>
    </section>
  );
};

export { InspectorPanel };
export default InspectorPanel;
