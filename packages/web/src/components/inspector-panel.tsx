import { useMemo } from "react";

import { blockRegistry } from "@workflow-builder/core";

import { useEditorStore } from "../state/editor-store";
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
  program: "#3A5AE5",
  control: "#AF54BE",
  variables: "#E2A636",
  functions: "#32AA81",
  expressions: "#578BC9",
  ai: "#AF54BE",
  automation: "#32AA81",
  utility: "#3A5AE5",
  io: "#578BC9",
  raw: "#CD3A50"
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
      <section className="flex h-full flex-1 flex-col border-b border-[#0A1A2314] bg-white/85 p-4 backdrop-blur">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#657782]">Inspector</h2>
        <p className="mt-4 text-sm text-[#657782]">Select a block to configure its properties.</p>
      </section>
    );
  }

  const block = document.blocks[selectedBlockId];
  if (!block) {
    return (
      <section className="flex h-full flex-1 flex-col border-b border-[#0A1A2314] bg-white/85 p-4 backdrop-blur">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#657782]">Inspector</h2>
        <p className="mt-4 text-sm text-[#CD3A50]">Selected block not found.</p>
      </section>
    );
  }

  const schema = blockRegistry.get(block.kind);
  const fields = schema?.fields ?? [];
  const outputs = schema?.outputs ?? [];
  const category = schema?.category ?? "utility";
  const accent = categoryColors[category] ?? "#3A5AE5";
  const iconName = categoryIcons[category] ?? "workflow";
  const isRoot = block.id === document.root;

  return (
    <section className="flex h-full flex-col overflow-hidden bg-white/85 backdrop-blur">
      <div className="flex items-center justify-between border-b border-[#0A1A2314] px-6 py-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${accent}14`, color: accent }}
          >
            <Icon name={iconName} className="h-5 w-5" />
          </span>
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-[#0A1A23]">{schema?.label ?? block.kind}</h2>
            <span className="text-[11px] uppercase tracking-[0.3em] text-[#657782]">{block.kind}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isRoot ? (
            <>
              <button
                type="button"
                onClick={() => duplicateBlock(block.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#0A1A2333] bg-white text-[#0A1A23] transition hover:border-[#32AA81] hover:text-[#32AA81]"
                title="Duplicate block"
                aria-label="Duplicate block"
              >
                <Icon name="copy" className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => deleteBlock(block.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#CD3A50] bg-white text-[#CD3A50] transition hover:bg-[#CD3A5020]"
                title="Delete block"
                aria-label="Delete block"
              >
                <Icon name="trash" className="h-3.5 w-3.5" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      <nav className="flex flex-wrap items-center gap-2 border-b border-[#0A1A2314] bg-white/90 px-6 py-2 text-[11px] text-[#657782]">
        {pathSegments.map((segment, index) => {
          const blockInstance = document.blocks[segment.blockId];
          const segmentSchema = blockInstance ? blockRegistry.get(blockInstance.kind) : null;
          const label = segmentSchema?.label ?? blockInstance?.kind ?? segment.blockId;
          const isCurrent = segment.blockId === effectiveSelectedId;

          return (
            <div key={segment.blockId} className="flex items-center gap-2">
              {index > 0 ? <span className="text-[#CED6E9]">/</span> : null}
              {segment.slotLabel ? (
                <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#3A5AE5]">
                  {segment.slotLabel}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => selectBlock(segment.blockId)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  isCurrent ? "bg-[#3A5AE5] text-white" : "bg-white text-[#0A1A23] hover:bg-[#E7EBFF]"
                }`}
              >
                {label}
              </button>
            </div>
          );
        })}
      </nav>

      {schema?.description ? (
        <div className="border-b border-[#0A1A2314] bg-white px-6 py-3 text-[12px] text-[#465764]">
          {schema.description}
        </div>
      ) : null}

      {outputs.length > 0 ? (
        <div className="flex flex-col gap-2 border-b border-[#0A1A2314] bg-white/85 px-6 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9AA7B4]">Outputs</h3>
          <ul className="flex flex-col gap-2">
            {outputs.map((output) => (
              <li key={output.id} className="flex flex-col rounded-lg border border-[#0A1A2314] bg-white px-3 py-2">
                <span className="text-sm font-semibold text-[#0A1A23]">{output.label}</span>
                {output.description ? (
                  <span className="text-xs text-[#657782]">{output.description}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-8 pt-6">
        {fields.length === 0 ? (
          <p className="text-sm text-[#657782]">This block has no configurable fields.</p>
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
