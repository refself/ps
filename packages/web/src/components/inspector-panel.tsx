import { blockRegistry } from "@workflow-builder/core";

import { useEditorStore } from "../state/editor-store";
import FieldEditor from "./inspector/field-editor";

const InspectorPanel = () => {
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
  const document = useEditorStore((state) => state.document);
  const updateBlockFields = useEditorStore((state) => state.updateBlockFields);

  if (!selectedBlockId) {
    return (
      <section className="flex h-full flex-1 flex-col border-b border-slate-800 bg-slate-950/80 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Inspector</h2>
        <p className="mt-4 text-sm text-slate-500">Select a block to configure its properties.</p>
      </section>
    );
  }

  const block = document.blocks[selectedBlockId];
  if (!block) {
    return (
      <section className="flex h-full flex-1 flex-col border-b border-slate-800 bg-slate-950/80 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Inspector</h2>
        <p className="mt-4 text-sm text-red-400">Selected block not found.</p>
      </section>
    );
  }

  const schema = blockRegistry.get(block.kind);
  const fields = schema?.fields ?? [];

  return (
    <section className="flex h-full flex-1 flex-col overflow-hidden border-b border-slate-800 bg-slate-950/70">
      <div className="flex flex-col gap-6 overflow-y-auto px-5 pb-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Inspector</h2>
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 shadow-sm shadow-slate-950/40">
            <h3 className="text-base font-semibold text-slate-100">{schema?.label ?? block.kind}</h3>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{block.kind}</p>
            {schema?.description ? <p className="mt-2 text-xs text-slate-400">{schema.description}</p> : null}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {fields.length === 0 ? (
            <p className="text-sm text-slate-500">This block has no configurable fields.</p>
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
      </div>
    </section>
  );
};

export { InspectorPanel };
export default InspectorPanel;
