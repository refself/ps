import { blockRegistry } from "@workflow-builder/core";

import { useEditorStore } from "../state/editor-store";
import FieldEditor from "./inspector/field-editor";

const InspectorPanel = () => {
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
  const document = useEditorStore((state) => state.document);
  const updateBlockFields = useEditorStore((state) => state.updateBlockFields);

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

  return (
    <section className="flex h-full flex-1 flex-col overflow-hidden border-b border-[#0A1A2314] bg-white/80 backdrop-blur">
      <div className="flex flex-col gap-6 overflow-y-auto px-5 pb-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#657782]">Inspector</h2>
          <div className="rounded-xl border border-[#0A1A2314] bg-white p-4 shadow-[0_18px_30px_rgba(10,26,35,0.08)]">
            <h3 className="text-base font-semibold text-[#0A1A23]">{schema?.label ?? block.kind}</h3>
            <p className="text-xs uppercase tracking-[0.4em] text-[#657782]">{block.kind}</p>
            {schema?.description ? <p className="mt-2 text-xs text-[#465764]">{schema.description}</p> : null}
          </div>
        </div>

        <div className="flex flex-col gap-4">
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
      </div>
    </section>
  );
};

export { InspectorPanel };
export default InspectorPanel;
