import clsx from "clsx";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { useEditorStore } from "../../state/editor-store";
import { collectIdentifiers } from "../../utils/workflow-introspection";

type ExpressionKind = "string" | "number" | "boolean" | "identifier" | "custom";

type ExpressionEditorProps = {
  value: string;
  onChange: (expression: string) => void;
  label: string;
  description?: string;
  variant?: "default" | "compact";
  showHeader?: boolean;
};

const quoteString = (input: string) => {
  const escaped = input.replace(/"/g, '\\"');
  return `"${escaped}"`;
};

const unquoteString = (input: string) => {
  if ((input.startsWith('"') && input.endsWith('"')) || (input.startsWith("'") && input.endsWith("'"))) {
    return input.slice(1, -1);
  }
  return input;
};

const detectExpressionKind = (expression: string): ExpressionKind => {
  const trimmed = expression.trim();
  if (!trimmed) {
    return "string";
  }
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return "string";
  }
  if (/^(true|false)$/i.test(trimmed)) {
    return "boolean";
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return "number";
  }
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    return "identifier";
  }
  return "custom";
};

const ExpressionEditor = ({
  value,
  onChange,
  label,
  description,
  variant = "default",
  showHeader = true
}: ExpressionEditorProps) => {
  const document = useEditorStore((state) => state.document);
  const identifiers = useMemo(() => collectIdentifiers(document), [document]);
  const [kind, setKind] = useState<ExpressionKind>(() => detectExpressionKind(value));
  const [stringValue, setStringValue] = useState(() => unquoteString(value.trim()));
  const [numberValue, setNumberValue] = useState(() => (Number.isNaN(Number(value.trim())) ? "" : value.trim()));
  const [identifierValue, setIdentifierValue] = useState(() => value.trim());
  const [booleanValue, setBooleanValue] = useState(() => value.trim().toLowerCase() === "true");
  const [customValue, setCustomValue] = useState(() => value);
  const baseId = useMemo(
    () => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-"),
    [label]
  );
  const radioName = `boolean-editor-${baseId}`;
  const datalistId = `identifier-options-${baseId}`;

  useEffect(() => {
    setKind(detectExpressionKind(value));
    setStringValue(unquoteString(value.trim()));
    setNumberValue(Number.isNaN(Number(value.trim())) ? "" : value.trim());
    setIdentifierValue(value.trim());
    setBooleanValue(value.trim().toLowerCase() === "true");
    setCustomValue(value);
  }, [value]);

  const isCompact = variant === "compact";

  const inputClass = isCompact
    ? "w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
    : "w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  const textAreaClass = isCompact
    ? "w-full min-h-[140px] rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
    : "w-full min-h-[160px] rounded border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  const selectClass = isCompact
    ? "rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
    : "rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  const tokensClass = isCompact
    ? "rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-semibold text-slate-100 transition hover:border-sky-400 hover:bg-sky-500/20"
    : "rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-200";

  const headerTextClass = isCompact ? "font-medium text-slate-100" : "font-medium text-slate-100";
  const descriptionTextClass = isCompact ? "text-xs text-slate-300" : "text-xs text-slate-400";

  const applyExpression = (nextKind: ExpressionKind, options?: { force?: boolean }) => {
    const targetKind = options?.force ? nextKind : kind;
    switch (targetKind) {
      case "string":
        onChange(quoteString(stringValue));
        break;
      case "number":
        onChange(numberValue ? String(Number(numberValue)) : "0");
        break;
      case "boolean":
        onChange(booleanValue ? "true" : "false");
        break;
      case "identifier":
        onChange(identifierValue || "result");
        break;
      default:
        onChange(value);
        break;
    }
  };

  const handleKindChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextKind = event.target.value as ExpressionKind;
    setKind(nextKind);
    applyExpression(nextKind, { force: true });
  };

  const handleVariableInsert = (identifier: string) => {
    setKind("identifier");
    setIdentifierValue(identifier);
    setStringValue(identifier);
    setNumberValue(identifier);
    setBooleanValue(identifier.toLowerCase() === "true");
    onChange(identifier);
  };

  const renderEditor = () => {
    switch (kind) {
      case "string":
        return (
          <input
            value={stringValue}
            onChange={(event) => {
              setStringValue(event.target.value);
              onChange(quoteString(event.target.value));
            }}
            className={inputClass}
            placeholder="Enter text"
          />
        );
      case "number":
        return (
          <input
            type="number"
            value={numberValue}
            onChange={(event) => {
              setNumberValue(event.target.value);
              if (event.target.value === "") {
                onChange("0");
              } else {
                onChange(String(Number(event.target.value)));
              }
            }}
            className={inputClass}
            placeholder="0"
          />
        );
      case "boolean":
        return (
          <div className={clsx("flex items-center gap-3 text-sm", isCompact ? "text-slate-100" : "text-slate-100")}>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={radioName}
                checked={booleanValue}
                onChange={() => {
                  setBooleanValue(true);
                  onChange("true");
                }}
                className="text-blue-400 focus:ring-blue-500"
              />
              True
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={radioName}
                checked={!booleanValue}
                onChange={() => {
                  setBooleanValue(false);
                  onChange("false");
                }}
                className="text-blue-400 focus:ring-blue-500"
              />
              False
            </label>
          </div>
        );
      case "identifier":
        return (
          <input
            list={datalistId}
            value={identifierValue}
            onChange={(event) => {
              setIdentifierValue(event.target.value);
              onChange(event.target.value);
            }}
            className={inputClass}
            placeholder="variableName"
          />
        );
      default:
        return (
          <textarea
            value={customValue}
            onChange={(event) => {
              setCustomValue(event.target.value);
              onChange(event.target.value);
            }}
            className={textAreaClass}
          />
        );
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {showHeader ? (
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className={headerTextClass}>{label}</span>
            {description ? <span className={descriptionTextClass}>{description}</span> : null}
          </div>
          <select value={kind} onChange={handleKindChange} className={selectClass}>
            <option value="string">Text</option>
            <option value="number">Number</option>
            <option value="boolean">True/False</option>
            <option value="identifier">Identifier</option>
            <option value="custom">Existing</option>
          </select>
        </div>
      ) : (
        <div className="flex justify-end">
          <select value={kind} onChange={handleKindChange} className={selectClass}>
            <option value="string">Text</option>
            <option value="number">Number</option>
            <option value="boolean">True/False</option>
            <option value="identifier">Identifier</option>
            <option value="custom">Existing</option>
          </select>
        </div>
      )}
      {renderEditor()}
      {identifiers.length > 0 ? (
        <div className="flex flex-wrap gap-1 text-[10px] uppercase tracking-wide text-slate-500">
          <span className="text-slate-400">Available variables:</span>
          {identifiers.map((identifier) => (
            <button
              key={`${identifier}-${baseId}`}
              type="button"
              onClick={() => handleVariableInsert(identifier)}
              className={tokensClass}
            >
              {identifier}
            </button>
          ))}
        </div>
      ) : null}
      <datalist id={datalistId}>
        {identifiers.map((identifier) => (
          <option key={identifier} value={identifier} />
        ))}
      </datalist>
    </div>
  );
};

export default ExpressionEditor;
