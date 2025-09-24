import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { BlockFieldDefinition } from "@workflow-builder/core";

import { useEditorStore } from "../../state/editor-store";
import { editorTheme } from "../../theme";
import { withAlpha } from "../../utils/color";

import ExpressionEditor from "./expression-editor";
import JsonSchemaEditor from "./json-schema-editor";

type FieldEditorProps = {
  field: BlockFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  contextBlockId?: string;
};

const descriptionStyle = { color: editorTheme.colors.shaded } as const;
const labelTextStyle = { color: editorTheme.colors.foreground } as const;
const baseInputClass =
  "w-full rounded border bg-[var(--editor-color-background-default)] p-2 text-sm outline-none focus:border-[var(--editor-color-action)] focus:ring-2 focus:ring-[var(--editor-color-action)]";
const baseInputStyle = {
  borderColor: editorTheme.colors.borderStrong,
  color: editorTheme.colors.foreground,
  background: editorTheme.colors.backgroundDefault,
} as const;

const FieldEditor = ({ field, value, onChange, contextBlockId }: FieldEditorProps) => {
  const input = field.input;
  const fallbackValue = field.defaultValue;
  const contextBlockKind = useEditorStore((state) =>
    contextBlockId ? state.document.blocks[contextBlockId]?.kind : undefined
  );
  const enableQuickSchemaBuilder = useMemo(
    () => contextBlockKind === "ai-call" || contextBlockKind === "vision-call",
    [contextBlockKind]
  );
  const [isSchemaModalOpen, setSchemaModalOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const { body } = document;
    if (isSchemaModalOpen) {
      const previousOverflow = body.style.overflow;
      body.style.overflow = "hidden";
      return () => {
        body.style.overflow = previousOverflow;
      };
    }
    return () => {};
  }, [isSchemaModalOpen]);

  if (input.kind === "boolean") {
    const checked = typeof value === "boolean" ? value : Boolean(fallbackValue);
    return (
      <label
        className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm shadow-[0_12px_20px_rgba(10,26,35,0.08)]"
        style={{
          borderColor: editorTheme.colors.borderSubtle,
          background: editorTheme.surfaces.card,
          color: editorTheme.colors.foreground,
        }}
      >
        <span className="flex flex-col">
          <span className="font-medium" style={labelTextStyle}>
            {field.label}
          </span>
          {field.description ? (
            <span className="text-xs" style={descriptionStyle}>
              {field.description}
            </span>
          ) : null}
        </span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded focus:ring-[var(--editor-color-action)]"
          style={{
            borderColor: editorTheme.colors.borderStrong,
            color: editorTheme.colors.action,
          }}
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
      <label className="flex flex-col gap-2 text-sm" style={labelTextStyle}>
        <div className="flex flex-col gap-1">
          <span className="font-medium" style={labelTextStyle}>
            {field.label}
          </span>
          {field.description ? (
            <span className="text-xs" style={descriptionStyle}>
              {field.description}
            </span>
          ) : null}
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
          className={baseInputClass}
          style={baseInputStyle}
        />
      </label>
    );
  }

  if (input.kind === "enum") {
    const stringValue = typeof value === "string" ? value : (typeof fallbackValue === "string" ? fallbackValue : "");
    return (
      <label className="flex flex-col gap-2 text-sm" style={labelTextStyle}>
        <div className="flex flex-col gap-1">
          <span className="font-medium" style={labelTextStyle}>
            {field.label}
          </span>
          {field.description ? (
            <span className="text-xs" style={descriptionStyle}>
              {field.description}
            </span>
          ) : null}
        </div>
        <select
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          className={`${baseInputClass} appearance-none`}
          style={baseInputStyle}
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
      <label className="flex flex-col gap-2 text-sm" style={labelTextStyle}>
        <div className="flex flex-col gap-1">
          <span className="font-medium" style={labelTextStyle}>
            {field.label}
          </span>
          {field.description ? (
            <span className="text-xs" style={descriptionStyle}>
              {field.description}
            </span>
          ) : null}
        </div>
        <input
          value={identifierValue}
          onChange={(event) => onChange(event.target.value)}
          className={`${baseInputClass} placeholder:text-[var(--editor-color-accent-muted)]`}
          style={baseInputStyle}
          placeholder="identifier"
        />
      </label>
    );
  }

  if (input.kind === "string") {
    const stringValue = typeof value === "string" ? value : (typeof fallbackValue === "string" ? fallbackValue : "");
    if (input.multiline) {
      return (
        <label className="flex flex-col gap-2 text-sm" style={labelTextStyle}>
          <div className="flex flex-col gap-1">
            <span className="font-medium" style={labelTextStyle}>
              {field.label}
            </span>
            {field.description ? (
              <span className="text-xs" style={descriptionStyle}>
                {field.description}
              </span>
            ) : null}
          </div>
          <textarea
            value={stringValue}
            onChange={(event) => onChange(event.target.value)}
            rows={4}
            className={`${baseInputClass} placeholder:text-[var(--editor-color-accent-muted)]`}
            style={baseInputStyle}
            placeholder={input.placeholder}
          />
        </label>
      );
    }

    return (
      <label className="flex flex-col gap-2 text-sm" style={labelTextStyle}>
        <div className="flex flex-col gap-1">
          <span className="font-medium" style={labelTextStyle}>
            {field.label}
          </span>
          {field.description ? (
            <span className="text-xs" style={descriptionStyle}>
              {field.description}
            </span>
          ) : null}
        </div>
        <input
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          className={`${baseInputClass} placeholder:text-[var(--editor-color-accent-muted)]`}
          style={baseInputStyle}
          placeholder={input.placeholder}
        />
      </label>
    );
  }

  if (input.kind === "code" || input.kind === "expression") {
    const preferCustomEditor = input.kind === "code";
    const language = input.kind === "code" ? input.language : undefined;
    const placeholder = input.kind === "code" ? input.placeholder : undefined;
    return (
      <div
        className="rounded-xl border p-3 shadow-[0_18px_32px_rgba(10,26,35,0.08)]"
        style={{
          borderColor: editorTheme.colors.borderSubtle,
          background: editorTheme.surfaces.card,
        }}
      >
        <ExpressionEditor
          value={typeof value === "string" ? value : typeof fallbackValue === "string" ? fallbackValue : ""}
          onChange={(expression) => onChange(expression)}
          label={field.label}
          description={field.description}
          contextBlockId={contextBlockId}
          preferCustomEditor={preferCustomEditor}
          language={language}
          placeholder={placeholder}
        />
      </div>
    );
  }

  if (input.kind === "json-schema") {
    const schemaValue = typeof value === "string" ? value : typeof fallbackValue === "string" ? fallbackValue : "";
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setSchemaModalOpen(true)}
          className="self-start rounded-lg border px-3 py-2 text-sm shadow-sm transition hover:border-[var(--editor-color-action)] hover:text-[var(--editor-color-action)]"
          style={{
            borderColor: editorTheme.colors.borderStrong,
            background: editorTheme.colors.backgroundDefault,
            color: editorTheme.colors.foreground,
          }}
        >
          edit schema
        </button>
        {schemaValue ? (
          <pre
            className="max-h-48 overflow-auto rounded-lg border p-3 text-xs"
            style={{
              borderColor: editorTheme.colors.borderSubtle,
              background: editorTheme.colors.backgroundSoft,
              color: editorTheme.colors.shaded,
            }}
          >
            {schemaValue}
          </pre>
        ) : (
          <div
            className="rounded-lg border border-dashed p-3 text-xs"
            style={{
              borderColor: editorTheme.colors.borderStrong,
              background: editorTheme.colors.backgroundSoft,
              color: editorTheme.colors.shaded,
            }}
          >
            No schema defined yet.
          </div>
        )}
        {isSchemaModalOpen && typeof document !== "undefined"
          ? createPortal(
              <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: withAlpha(editorTheme.colors.foreground, 0.55) }}>
                <div
                  className="flex w-full max-w-3xl max-h-[85vh] flex-col overflow-hidden rounded-2xl shadow-[0_32px_72px_rgba(10,26,35,0.18)]"
                  style={{ background: editorTheme.surfaces.card }}
                >
                  <div
                    className="flex items-center justify-between border-b px-6 py-4"
                    style={{ borderColor: editorTheme.colors.borderSubtle }}
                  >
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold" style={labelTextStyle}>
                        {field.label}
                      </span>
                      {field.description ? (
                        <span className="text-sm" style={descriptionStyle}>
                          {field.description}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSchemaModalOpen(false)}
                      className="rounded-md border px-3 py-1.5 text-sm transition hover:border-[var(--editor-color-action)] hover:text-[var(--editor-color-action)]"
                      style={{
                        borderColor: editorTheme.colors.borderStrong,
                        color: editorTheme.colors.foreground,
                        background: editorTheme.colors.backgroundDefault,
                      }}
                    >
                      close
                    </button>
                  </div>
                  <div
                    className="flex flex-1 flex-col overflow-hidden p-6"
                    style={{ background: editorTheme.colors.backgroundSoft }}
                  >
                    <div
                      className="flex-1 overflow-auto rounded-xl border p-4 shadow-inner"
                      style={{
                        borderColor: editorTheme.colors.borderSubtle,
                        background: editorTheme.colors.backgroundDefault,
                      }}
                    >
                      <JsonSchemaEditor
                        value={schemaValue}
                        onChange={(next) => onChange(next)}
                        label="schema"
                        enableQuickBuilder={enableQuickSchemaBuilder}
                      />
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )
          : null}
      </div>
    );
  }

  return (
    <label className="flex flex-col gap-2 text-sm" style={labelTextStyle}>
      <span className="font-medium" style={labelTextStyle}>
        {field.label}
      </span>
      <span className="text-xs" style={descriptionStyle}>
        Unsupported field type
      </span>
    </label>
  );
};

export default FieldEditor;
