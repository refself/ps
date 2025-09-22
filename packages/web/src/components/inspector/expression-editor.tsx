import clsx from "clsx";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { useEditorStore } from "../../state/editor-store";
import {
  collectIdentifierSuggestions,
  collectIdentifierSuggestionsForBlock,
  type IdentifierSuggestion
} from "../../utils/workflow-introspection";

type ExpressionKind = "string" | "number" | "boolean" | "identifier" | "custom";

type EditorLanguage = "reflow" | "json" | "text" | undefined;

type ExpressionEditorProps = {
  value: string;
  onChange: (expression: string) => void;
  label: string;
  description?: string;
  variant?: "default" | "compact";
  showHeader?: boolean;
  contextBlockId?: string;
  preferCustomEditor?: boolean;
  language?: EditorLanguage;
  placeholder?: string;
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
  contextBlockId,
  preferCustomEditor = false,
  language,
  placeholder
}: ExpressionEditorProps) => {
  const document = useEditorStore((state) => state.document);
  const identifierSuggestions = useMemo<IdentifierSuggestion[]>(() => {
    if (!contextBlockId) {
      return collectIdentifierSuggestions(document);
    }
    return collectIdentifierSuggestionsForBlock({ document, blockId: contextBlockId });
  }, [contextBlockId, document]);
  const [kind, setKind] = useState<ExpressionKind>(() => {
    if (preferCustomEditor && value.trim() === "") {
      return "custom";
    }
    return detectExpressionKind(value);
  });
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
    const trimmed = value.trim();
    const detected = detectExpressionKind(value);
    if (preferCustomEditor && trimmed === "") {
      setKind("custom");
    } else {
      setKind(detected);
    }
    setStringValue(unquoteString(value.trim()));
    setNumberValue(Number.isNaN(Number(value.trim())) ? "" : value.trim());
    setIdentifierValue(value.trim());
    setBooleanValue(value.trim().toLowerCase() === "true");
    setCustomValue(value);
  }, [preferCustomEditor, value]);

  useEffect(() => {
    if (identifierSuggestions.length === 0) {
      setPaletteOpen(false);
      setSearchTerm("");
    }
  }, [identifierSuggestions.length]);

  const isCompact = variant === "compact";
  const [isPaletteOpen, setPaletteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const inputClass = isCompact
    ? "w-full rounded-lg border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-sm text-[#0A1A23] placeholder:text-[#9AA7B4] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
    : "w-full rounded-lg border border-[#0A1A2333] bg-white px-3 py-2 text-sm text-[#0A1A23] placeholder:text-[#9AA7B4] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]";

  const baseTextAreaClass = isCompact
    ? "w-full min-h-[120px] rounded-lg border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
    : "w-full min-h-[160px] rounded-lg border border-[#0A1A2333] bg-white px-3 py-2 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]";

  const textAreaClass = clsx(baseTextAreaClass, language === "json" || language === "reflow" ? "font-mono" : null);

  const selectClass = isCompact
    ? "rounded-md border border-[#0A1A2333] bg-white px-2 py-1 text-[11px] text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
    : "rounded-md border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-xs text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]";

  const headerTextClass = isCompact ? "font-medium text-[#0A1A23]" : "font-medium text-[#0A1A23]";
  const descriptionTextClass = isCompact ? "text-xs text-[#657782]" : "text-xs text-[#657782]";

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

  const handleIdentifierInsert = (identifier: string) => {
    setKind("identifier");
    setIdentifierValue(identifier);
    setStringValue(identifier);
    setNumberValue(identifier);
    setBooleanValue(identifier.toLowerCase() === "true");
    onChange(identifier);
  };

  const handleExpressionInsert = (expression: string) => {
    setKind("custom");
    setCustomValue(expression);
    setIdentifierValue(expression);
    setStringValue(expression);
    setNumberValue(expression);
    setBooleanValue(expression.toLowerCase() === "true");
    onChange(expression);
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
          <div className={clsx("flex items-center gap-3 text-sm", isCompact ? "text-[#0A1A23]" : "text-[#0A1A23]")}>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={radioName}
                checked={booleanValue}
                onChange={() => {
                  setBooleanValue(true);
                  onChange("true");
                }}
                className="text-[#3A5AE5] focus:ring-[#3A5AE5]"
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
                className="text-[#3A5AE5] focus:ring-[#3A5AE5]"
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
            placeholder={placeholder}
          />
        );
    }
  };

  const filteredSuggestions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return identifierSuggestions;
    }
    return identifierSuggestions.filter((suggestion) => {
      if (suggestion.name.toLowerCase().includes(query)) {
        return true;
      }
      return suggestion.outputs.some((output) => {
        if (output.expression.toLowerCase().includes(query)) {
          return true;
        }
        if (output.label.toLowerCase().includes(query)) {
          return true;
        }
        return output.description ? output.description.toLowerCase().includes(query) : false;
      });
    });
  }, [identifierSuggestions, searchTerm]);

  const identifierNames = useMemo(() => identifierSuggestions.map((item) => item.name), [identifierSuggestions]);

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
          {identifierSuggestions.length > 0 ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setPaletteOpen((open) => !open)}
                className={clsx(
                  "rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition",
                  isPaletteOpen
                    ? "border-[#3A5AE5] bg-[#3A5AE510] text-[#3A5AE5]"
                    : "border-[#0A1A2333] bg-white text-[#3A5AE5] hover:border-[#3A5AE5] hover:bg-[#3A5AE510]"
                )}
              >
                Variables
              </button>
              {isPaletteOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-[#0A1A2314] bg-white p-3 shadow-[0_18px_32px_rgba(10,26,35,0.12)]">
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search variables"
                    className="w-full rounded-md border border-[#0A1A2333] bg-white px-2 py-1 text-[12px] text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
                  />
                  <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                    {filteredSuggestions.length === 0 ? (
                      <div className="rounded-md border border-[#0A1A2314] bg-[#F5F6F9] px-2 py-1 text-[11px] text-[#657782]">
                        No matches
                      </div>
                    ) : null}
                    {filteredSuggestions.map((suggestion) => (
                      <div
                        key={`${suggestion.name}-${baseId}`}
                        className="flex flex-col gap-1 rounded-lg border border-[#E1E6F2] bg-white px-2 py-1.5"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            handleIdentifierInsert(suggestion.name);
                            setPaletteOpen(false);
                            setSearchTerm("");
                          }}
                          className="flex flex-col text-left"
                        >
                          <span className="text-sm font-semibold text-[#0A1A23]">{suggestion.name}</span>
                          {suggestion.sourceLabel ? (
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[#9AA7B4]">
                              {suggestion.sourceLabel}
                            </span>
                          ) : null}
                        </button>
                        {suggestion.outputs.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pl-2">
                            {suggestion.outputs.map((output) => (
                              <button
                                key={`${suggestion.name}.${output.id}`}
                                type="button"
                                onClick={() => {
                                  handleExpressionInsert(output.expression);
                                  setPaletteOpen(false);
                                  setSearchTerm("");
                                }}
                                className="rounded-full border border-[#0A1A2333] bg-white px-2 py-0.5 text-[10px] text-[#3A5AE5] transition hover:border-[#3A5AE5] hover:bg-[#3A5AE510]"
                                title={output.description}
                              >
                                {output.expression}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
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
        {identifierNames.map((identifier) => (
          <option key={identifier} value={identifier} />
        ))}
      </datalist>
    </div>
  );
};

export default ExpressionEditor;
