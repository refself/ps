import clsx from "clsx";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { useEditorStore } from "../../state/editor-store";
import { collectIdentifiers, collectIdentifiersForBlock } from "../../utils/workflow-introspection";
import { getIdentifierStyle } from "../../utils/identifier-colors";

type ExpressionKind = "string" | "number" | "boolean" | "identifier" | "custom";

type ExpressionEditorProps = {
  value: string;
  onChange: (expression: string) => void;
  label: string;
  description?: string;
  variant?: "default" | "compact";
  showHeader?: boolean;
  contextBlockId?: string;
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
  showHeader = true,
  contextBlockId
}: ExpressionEditorProps) => {
  const document = useEditorStore((state) => state.document);
  const identifiers = useMemo(() => {
    if (!contextBlockId) {
      return collectIdentifiers(document);
    }
    return collectIdentifiersForBlock({ document, blockId: contextBlockId });
  }, [contextBlockId, document]);
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

  useEffect(() => {
    if (identifiers.length === 0) {
      setPaletteOpen(false);
      setSearchTerm("");
    }
  }, [identifiers.length]);

  const isCompact = variant === "compact";
  const [isPaletteOpen, setPaletteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const inputClass = isCompact
    ? "w-full rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
    : "w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  const textAreaClass = isCompact
    ? "w-full min-h-[120px] rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
    : "w-full min-h-[160px] rounded border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  const selectClass = isCompact
    ? "rounded-md border border-white/10 bg-white/10 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
    : "rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  const getTokenClass = (identifier: string) => {
    if (isCompact) {
      const style = getIdentifierStyle(identifier);
      return clsx(
        "mb-1 w-full rounded-md px-2 py-1 text-left text-[12px] font-semibold uppercase tracking-wide last:mb-0",
        style.chip,
        style.text
      );
    }

    return "rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-200";
  };

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

  const filteredIdentifiers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return identifiers;
    }
    return identifiers.filter((identifier) => identifier.toLowerCase().includes(query));
  }, [identifiers, searchTerm]);

  return (
    <div className="flex flex-col gap-2">
      <div className={clsx("flex items-start", showHeader ? "justify-between" : "justify-end")}
>
        {showHeader ? (
          <div className="flex flex-col">
            <span className={headerTextClass}>{label}</span>
            {description ? <span className={descriptionTextClass}>{description}</span> : null}
          </div>
        ) : null}
        <div className="flex items-center gap-1.5">
          {identifiers.length > 0 ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setPaletteOpen((open) => !open)}
                className={clsx(
                  "rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100 transition",
                  isPaletteOpen ? "border-sky-400/60 bg-sky-500/20" : "hover:border-sky-300/60 hover:bg-sky-500/15"
                )}
              >
                Variables
              </button>
              {isPaletteOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-white/15 bg-slate-950/95 p-3 shadow-xl shadow-slate-950/60">
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search variables"
                    className="w-full rounded-md border border-white/10 bg-white/10 px-2 py-1 text-[12px] text-slate-100 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                  />
                  <div className="mt-2 max-h-48 overflow-y-auto pr-1">
                    {filteredIdentifiers.length === 0 ? (
                      <div className="rounded-md border border-white/5 bg-white/5 px-2 py-1 text-[11px] text-slate-400">
                        No matches
                      </div>
                    ) : null}
                    {filteredIdentifiers.map((identifier) => (
                      <button
                        key={`${identifier}-${baseId}`}
                        type="button"
                        onClick={() => {
                          handleVariableInsert(identifier);
                          setPaletteOpen(false);
                          setSearchTerm("");
                        }}
                        className={getTokenClass(identifier)}
                      >
                        {identifier}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <select value={kind} onChange={handleKindChange} className={selectClass}>
            <option value="string">Text</option>
            <option value="number">Number</option>
            <option value="boolean">True/False</option>
            <option value="identifier">Identifier</option>
            <option value="custom">Existing</option>
          </select>
        </div>
      </div>
      {renderEditor()}
      <datalist id={datalistId}>
        {identifiers.map((identifier) => (
          <option key={identifier} value={identifier} />
        ))}
      </datalist>
    </div>
  );
};

export default ExpressionEditor;
