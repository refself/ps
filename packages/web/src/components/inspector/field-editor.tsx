import { ChangeEvent } from "react";

import type { BlockFieldDefinition } from "@workflow-builder/core";

import ExpressionEditor from "./expression-editor";

type FieldEditorProps = {
  field: BlockFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  contextBlockId?: string;
};

const FieldEditor = ({ field, value, onChange, contextBlockId }: FieldEditorProps) => {
  const input = field.input;
  const fallbackValue = field.defaultValue;

  if (input.kind === "boolean") {
    const checked = typeof value === "boolean" ? value : Boolean(fallbackValue);
    return (
      <label className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-sm shadow-slate-950/40">
        <span className="flex flex-col">
          <span className="font-medium text-slate-100">{field.label}</span>
          {field.description ? <span className="text-xs text-slate-400">{field.description}</span> : null}
        </span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-400 focus:ring-blue-500"
        />
      </label>
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
      <label className="flex flex-col gap-2 text-sm text-slate-100">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-slate-100">{field.label}</span>
          {field.description ? <span className="text-xs text-slate-400">{field.description}</span> : null}
        </div>
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
            } else {
              onChange(Number(next));
            }
          }}
          className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </label>
    );
  }

  if (input.kind === "enum") {
    const stringValue = typeof value === "string" ? value : (typeof fallbackValue === "string" ? fallbackValue : "");
    return (
      <label className="flex flex-col gap-2 text-sm text-slate-100">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-slate-100">{field.label}</span>
          {field.description ? <span className="text-xs text-slate-400">{field.description}</span> : null}
        </div>
        <select
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
      </label>
    );
  }

  if (input.kind === "identifier") {
    const identifierValue = typeof value === "string" ? value : (typeof fallbackValue === "string" ? fallbackValue : "");
    return (
      <label className="flex flex-col gap-2 text-sm text-slate-100">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-slate-100">{field.label}</span>
          {field.description ? <span className="text-xs text-slate-400">{field.description}</span> : null}
        </div>
        <input
          value={identifierValue}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="identifier"
        />
      </label>
    );
  }

  if (input.kind === "string") {
    const stringValue = typeof value === "string" ? value : (typeof fallbackValue === "string" ? fallbackValue : "");
    if (input.multiline) {
      return (
        <label className="flex flex-col gap-2 text-sm text-slate-100">
          <div className="flex flex-col gap-1">
            <span className="font-medium text-slate-100">{field.label}</span>
            {field.description ? <span className="text-xs text-slate-400">{field.description}</span> : null}
          </div>
          <textarea
            value={stringValue}
            onChange={(event) => onChange(event.target.value)}
            rows={4}
            className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder={input.placeholder}
          />
        </label>
      );
    }

    return (
      <label className="flex flex-col gap-2 text-sm text-slate-100">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-slate-100">{field.label}</span>
          {field.description ? <span className="text-xs text-slate-400">{field.description}</span> : null}
        </div>
        <input
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder={input.placeholder}
        />
      </label>
    );
  }

  if (input.kind === "code" || input.kind === "expression") {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 shadow-sm shadow-slate-950/40">
        <ExpressionEditor
          value={typeof value === "string" ? value : typeof fallbackValue === "string" ? fallbackValue : ""}
          onChange={(expression) => onChange(expression)}
          label={field.label}
          description={field.description}
          contextBlockId={contextBlockId}
        />
      </div>
    );
  }

  return (
    <label className="flex flex-col gap-2 text-sm text-slate-200">
      <span className="font-medium text-slate-100">{field.label}</span>
      <span className="text-xs text-slate-500">Unsupported field type</span>
    </label>
  );
};

export default FieldEditor;
