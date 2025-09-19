import { ChangeEvent, useMemo } from "react";
import type { ReactNode } from "react";

import type { BlockFieldDefinition } from "@workflow-builder/core";

import { useEditorStore } from "../../state/editor-store";
import { collectIdentifiersForBlock } from "../../utils/workflow-introspection";
import ExpressionEditor from "../inspector/expression-editor";

type BlockFieldEditorProps = {
  field: BlockFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  blockId: string;
};

const FieldContainer = ({ title, description, children }: { title: string; description?: string; children: ReactNode }) => {
  return (
    <div className="rounded-xl border border-[#0A1A2314] bg-white px-3 py-3 shadow-[0_10px_24px_rgba(10,26,35,0.06)]">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#657782]">{title}</div>
      {description ? <p className="mt-1 text-[11px] text-[#465764]">{description}</p> : null}
      <div className="mt-2">{children}</div>
    </div>
  );
};

const BlockFieldEditor = ({ field, value, onChange, blockId }: BlockFieldEditorProps) => {
  const input = field.input;
  const fallbackValue = field.defaultValue;
  const document = useEditorStore((state) => state.document);
  const identifiers = useMemo(
    () => collectIdentifiersForBlock({ document, blockId }),
    [blockId, document]
  );

  if (input.kind === "boolean") {
    const checked = typeof value === "boolean" ? value : Boolean(fallbackValue);
    return (
      <FieldContainer title={field.label} description={field.description}>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className="relative inline-flex h-7 w-14 items-center rounded-full border border-[#0A1A2314] bg-[#E4E9FF] transition focus:outline-none focus:ring-2 focus:ring-[#3A5AE580]"
        >
          <span
            className={`pointer-events-none inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white text-[10px] font-semibold text-[#3A5AE5] shadow-sm transition ${
              checked ? "translate-x-7" : "translate-x-1"
            }`}
          >
            {checked ? "On" : "Off"}
          </span>
        </button>
      </FieldContainer>
    );
  }

  if (input.kind === "number") {
    const numericValue =
      typeof value === "number" || typeof value === "string"
        ? String(value)
        : typeof fallbackValue === "number" || typeof fallbackValue === "string"
        ? String(fallbackValue)
        : "";

    return (
      <FieldContainer title={field.label} description={field.description}>
        <input
          type="number"
          value={numericValue}
          min={input.min}
          max={input.max}
          step={input.step ?? 1}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const next = event.target.value;
            if (next === "") {
              onChange(undefined);
              return;
            }
            onChange(Number(next));
          }}
          className="w-full rounded-lg border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
        />
      </FieldContainer>
    );
  }

  if (input.kind === "enum") {
    const stringValue = typeof value === "string" ? value : typeof fallbackValue === "string" ? fallbackValue : "";
    return (
      <FieldContainer title={field.label} description={field.description}>
        <select
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-sm text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
        >
          <option value="" disabled>
            Select…
          </option>
          {input.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldContainer>
    );
  }

  if (input.kind === "identifier") {
    const identifierValue = typeof value === "string" ? value : typeof fallbackValue === "string" ? fallbackValue : "";
    const datalistId = `block-field-${field.id}-identifiers`;
    return (
      <FieldContainer title={field.label} description={field.description}>
        <input
          list={datalistId}
          value={identifierValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder="identifier"
          className="w-full rounded-lg border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
        />
        <datalist id={datalistId}>
          {identifiers.map((identifier) => (
            <option key={identifier} value={identifier} />
          ))}
        </datalist>
      </FieldContainer>
    );
  }

  if (input.kind === "string") {
    const stringValue = typeof value === "string" ? value : typeof fallbackValue === "string" ? fallbackValue : "";
    if (input.multiline) {
      return (
        <FieldContainer title={field.label} description={field.description}>
          <textarea
            value={stringValue}
            onChange={(event) => onChange(event.target.value)}
            rows={4}
            placeholder={input.placeholder}
            className="w-full rounded-lg border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
          />
        </FieldContainer>
      );
    }

    return (
      <FieldContainer title={field.label} description={field.description}>
        <input
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={input.placeholder}
          className="w-full rounded-lg border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
        />
      </FieldContainer>
    );
  }

  if (input.kind === "code" || input.kind === "expression") {
    return (
      <FieldContainer title={field.label} description={field.description}>
        <ExpressionEditor
          value={typeof value === "string" ? value : typeof fallbackValue === "string" ? fallbackValue : ""}
          onChange={(expression) => onChange(expression)}
          label={field.label}
          description={field.description}
          variant="compact"
          showHeader={false}
          contextBlockId={blockId}
        />
      </FieldContainer>
    );
  }

  return (
    <FieldContainer title={field.label} description={field.description}>
      <div className="text-xs text-slate-200">Unsupported field type</div>
    </FieldContainer>
  );
};

export default BlockFieldEditor;
