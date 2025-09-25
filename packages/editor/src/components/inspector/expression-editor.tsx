import clsx from "clsx";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { isValueTypeCompatible } from "@workflow-builder/core";
import type { ValueType } from "@workflow-builder/core";

import { useEditorStore } from "../../state/editor-store";
import { editorTheme } from "../../theme";
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
  expectedType?: ValueType;
};

const EXPRESSION_KIND_LABELS: Record<ExpressionKind, string> = {
  string: "Text",
  number: "Number",
  boolean: "True/False",
  identifier: "Identifier",
  custom: "Expression",
};

const DEFAULT_KIND_ORDER: ExpressionKind[] = ["string", "number", "boolean", "identifier", "custom"];

const ensureDistinctKinds = (kinds: ExpressionKind[]): ExpressionKind[] => {
  const unique = Array.from(new Set(kinds));
  return unique.length > 0 ? unique : ["custom"];
};

const flattenValueType = (valueType?: ValueType): ValueType[] => {
  if (!valueType) {
    return [];
  }
  if (valueType.kind === "union") {
    return valueType.options.flatMap((option) => flattenValueType(option));
  }
  return [valueType];
};

const isNumericScalar = (valueType: ValueType): boolean => {
  return valueType.kind === "number" || valueType.kind === "integer" || valueType.kind === "any";
};

const isCoordinateArrayType = (valueType: ValueType): boolean => {
  if (valueType.kind !== "array") {
    return false;
  }
  const elementTypes = flattenValueType(valueType.of);
  return elementTypes.every(isNumericScalar);
};

const isImageType = (valueType: ValueType): boolean => valueType.kind === "image";

const containsImageType = (valueType: ValueType): boolean => {
  if (isImageType(valueType)) {
    return true;
  }
  if (valueType.kind === "array") {
    return flattenValueType(valueType.of).some(isImageType);
  }
  return false;
};

const coordinateLiteralPattern = /^\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]\s*$/;

const parseCoordinateLiteral = (expression: string): { x: string; y: string } | null => {
  const match = expression.match(coordinateLiteralPattern);
  if (!match) {
    return null;
  }
  const [, xRaw, yRaw] = match;
  return { x: xRaw ?? "0", y: yRaw ?? "0" };
};

const toNumericLiteral = (raw: string): string => {
  if (raw.trim() === "") {
    return "0";
  }
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    return String(numeric);
  }
  return "0";
};

const formatCoordinateExpression = (coords: { x: string; y: string }): string => {
  return `[${toNumericLiteral(coords.x)}, ${toNumericLiteral(coords.y)}]`;
};

const determineAllowedKinds = (valueType?: ValueType): ExpressionKind[] => {
  if (!valueType) {
    return ensureDistinctKinds(DEFAULT_KIND_ORDER);
  }

  if (valueType.kind === "union") {
    const combined = valueType.options.flatMap((option) => determineAllowedKinds(option));
    return ensureDistinctKinds(combined);
  }

  if (valueType.kind === "array" || valueType.kind === "record") {
    return ensureDistinctKinds(["identifier", "custom"]);
  }

  switch (valueType.kind) {
    case "any":
    case "unknown":
      return ensureDistinctKinds(DEFAULT_KIND_ORDER);
    case "string":
      return ensureDistinctKinds(["string", "identifier", "custom"]);
    case "number":
    case "integer":
      return ensureDistinctKinds(["number", "identifier", "custom"]);
    case "boolean":
      return ensureDistinctKinds(["boolean", "identifier", "custom"]);
    case "identifier":
      return ensureDistinctKinds(["identifier"]);
    default:
      return ensureDistinctKinds(["identifier", "custom"]);
  }
};

const pickAllowedKind = (candidate: ExpressionKind, allowedKinds: ExpressionKind[]): ExpressionKind => {
  if (allowedKinds.includes(candidate)) {
    return candidate;
  }
  if (allowedKinds.includes("custom")) {
    return "custom";
  }
  return allowedKinds[0] ?? "custom";
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
  placeholder,
  expectedType
}: ExpressionEditorProps) => {
  const document = useEditorStore((state) => state.document);
  const identifierSuggestions = useMemo<IdentifierSuggestion[]>(() => {
    if (!contextBlockId) {
      return collectIdentifierSuggestions(document);
    }
    return collectIdentifierSuggestionsForBlock({ document, blockId: contextBlockId });
  }, [contextBlockId, document]);
  const flattenedExpectedTypes = useMemo(() => flattenValueType(expectedType), [expectedType]);
  const supportsCoordinateMode = useMemo(
    () => flattenedExpectedTypes.some(isCoordinateArrayType),
    [flattenedExpectedTypes]
  );
  const supportsImageQuickActions = useMemo(
    () => flattenedExpectedTypes.some(containsImageType),
    [flattenedExpectedTypes]
  );
  const initialCoordinate = parseCoordinateLiteral(value);
  const [coordinateInputs, setCoordinateInputs] = useState<{ x: string; y: string }>(
    () => initialCoordinate ?? { x: "0", y: "0" }
  );
  const [coordinateMode, setCoordinateMode] = useState<"auto" | "manual">(() =>
    supportsCoordinateMode && initialCoordinate ? "manual" : "auto"
  );
  const typedSuggestions = useMemo<IdentifierSuggestion[]>(
    () =>
      identifierSuggestions.map((suggestion) => ({
        ...suggestion,
        outputs: suggestion.outputs.filter((output) =>
          isValueTypeCompatible(output.valueType, expectedType)
        ),
      })),
    [expectedType, identifierSuggestions]
  );
  const allowedKinds = useMemo(() => determineAllowedKinds(expectedType), [expectedType]);
  const [kind, setKind] = useState<ExpressionKind>(() => {
    const baseKind = preferCustomEditor && value.trim() === "" ? "custom" : detectExpressionKind(value);
    return pickAllowedKind(baseKind, allowedKinds);
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
    const baseKind = preferCustomEditor && trimmed === "" ? "custom" : detectExpressionKind(value);
    const nextKind = pickAllowedKind(baseKind, allowedKinds);
    setKind(nextKind);
    setStringValue(unquoteString(value.trim()));
    setNumberValue(Number.isNaN(Number(value.trim())) ? "" : value.trim());
    setIdentifierValue(value.trim());
    setBooleanValue(value.trim().toLowerCase() === "true");
    setCustomValue(value);
  }, [allowedKinds, preferCustomEditor, value]);

  useEffect(() => {
    if (!supportsCoordinateMode) {
      if (coordinateMode !== "auto") {
        setCoordinateMode("auto");
      }
      return;
    }
    const parsed = parseCoordinateLiteral(value);
    if (coordinateMode === "manual") {
      if (parsed) {
        setCoordinateInputs(parsed);
      } else {
        setCoordinateMode("auto");
      }
      return;
    }
    if (parsed) {
      setCoordinateInputs(parsed);
    }
  }, [coordinateMode, supportsCoordinateMode, value]);

  useEffect(() => {
    setKind((current) => pickAllowedKind(current, allowedKinds));
  }, [allowedKinds]);

  useEffect(() => {
    if (identifierSuggestions.length === 0) {
      setPaletteOpen(false);
      setSearchTerm("");
    }
  }, [identifierSuggestions.length]);

  const isCompact = variant === "compact";
  const [isPaletteOpen, setPaletteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const inputStyle = {
    borderColor: editorTheme.colors.borderStrong,
    background: editorTheme.colors.backgroundDefault,
    color: editorTheme.colors.foreground,
  } as const;

  const placeholderClass = "placeholder:text-[var(--editor-color-accent-muted)]";

  const inputClass = isCompact
    ? `w-full rounded-lg border bg-[var(--editor-color-background-default)] px-2.5 py-1.5 text-sm outline-none ${placeholderClass} focus:border-[var(--editor-color-action)] focus:ring-2 focus:ring-[var(--editor-color-action)]`
    : `w-full rounded-lg border bg-[var(--editor-color-background-default)] px-3 py-2 text-sm outline-none ${placeholderClass} focus:border-[var(--editor-color-action)] focus:ring-2 focus:ring-[var(--editor-color-action)]`;

  const baseTextAreaClass = isCompact
    ? `w-full min-h-[120px] rounded-lg border bg-[var(--editor-color-background-default)] px-2.5 py-1.5 text-sm outline-none ${placeholderClass} focus:border-[var(--editor-color-action)] focus:ring-2 focus:ring-[var(--editor-color-action)]`
    : `w-full min-h-[160px] rounded-lg border bg-[var(--editor-color-background-default)] px-3 py-2 text-sm outline-none ${placeholderClass} focus:border-[var(--editor-color-action)] focus:ring-2 focus:ring-[var(--editor-color-action)]`;

  const textAreaClass = clsx(baseTextAreaClass, language === "json" || language === "reflow" ? "font-mono" : null);

  const manualCoordinatesEnabled = supportsCoordinateMode && coordinateMode === "manual";
  const showKindSelector = !manualCoordinatesEnabled && allowedKinds.length > 1;
  const hasVariableSuggestions = identifierSuggestions.length > 0;
  const activeKindLabel = manualCoordinatesEnabled
    ? "Coordinates"
    : EXPRESSION_KIND_LABELS[kind] ?? "Expression";
  const modeToggleClass =
    "rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition";
  const expressionPlaceholder = useMemo(() => {
    if (manualCoordinatesEnabled) {
      return "";
    }
    if (placeholder && placeholder.trim().length > 0) {
      return placeholder;
    }
    if (supportsCoordinateMode) {
      return "[x, y]";
    }
    if (supportsImageQuickActions) {
      return "e.g. screenshot().image";
    }
    return "Enter expression";
  }, [manualCoordinatesEnabled, placeholder, supportsCoordinateMode, supportsImageQuickActions]);
  const selectClass = isCompact
    ? "rounded-md border bg-[var(--editor-color-background-default)] px-2 py-1 text-[11px] outline-none focus:border-[var(--editor-color-action)] focus:ring-2 focus:ring-[var(--editor-color-action)]"
    : "rounded-md border bg-[var(--editor-color-background-default)] px-2.5 py-1.5 text-xs outline-none focus:border-[var(--editor-color-action)] focus:ring-2 focus:ring-[var(--editor-color-action)]";

  const headerTextStyle = { color: editorTheme.colors.foreground } as const;
  const descriptionTextStyle = { color: editorTheme.colors.shaded } as const;

  const headerTextClass = isCompact ? "font-medium" : "font-medium";
  const descriptionTextClass = isCompact ? "text-xs" : "text-xs";

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
    if (!allowedKinds.includes(nextKind)) {
      return;
    }
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

  const handleCoordinateInputChange = (axis: "x" | "y") => (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setCoordinateInputs((previous) => {
      const next = { ...previous, [axis]: nextValue };
      setKind("custom");
      onChange(formatCoordinateExpression(next));
      return next;
    });
  };

  const switchToManualCoordinates = () => {
    const parsed = parseCoordinateLiteral(value);
    const next = parsed ? { x: parsed.x, y: parsed.y } : { ...coordinateInputs };
    setCoordinateInputs(next);
    setCoordinateMode("manual");
    setKind("custom");
    setCustomValue(formatCoordinateExpression(next));
    onChange(formatCoordinateExpression(next));
  };

  const switchToExpressionMode = () => {
    if (coordinateMode !== "auto") {
      setCoordinateMode("auto");
    }
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
            style={inputStyle}
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
            style={inputStyle}
            placeholder="0"
          />
        );
      case "boolean":
        return (
          <div
            className="flex items-center gap-3 text-sm"
            style={{ color: editorTheme.colors.foreground }}
          >
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={radioName}
                checked={booleanValue}
                onChange={() => {
                  setBooleanValue(true);
                  onChange("true");
                }}
                className="text-[var(--editor-color-action)] focus:ring-[var(--editor-color-action)]"
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
                className="text-[var(--editor-color-action)] focus:ring-[var(--editor-color-action)]"
              />
              False
            </label>
          </div>
        );
      case "identifier":
        return (
          <input
            list={identifierSuggestions.length > 0 ? datalistId : undefined}
            value={identifierValue}
            onChange={(event) => {
              setIdentifierValue(event.target.value);
              onChange(event.target.value || "result");
            }}
            className={inputClass}
            style={inputStyle}
            placeholder="identifier"
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
            style={inputStyle}
            placeholder={expressionPlaceholder}
          />
        );
    }
  };

  const renderCoordinateEditor = () => {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-sm" style={headerTextStyle}>
            <span className="text-xs font-semibold" style={descriptionTextStyle}>
              X Coordinate
            </span>
            <input
              type="number"
              value={coordinateInputs.x}
              onChange={handleCoordinateInputChange("x")}
              className={inputClass}
              style={inputStyle}
              placeholder="0"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm" style={headerTextStyle}>
            <span className="text-xs font-semibold" style={descriptionTextStyle}>
              Y Coordinate
            </span>
            <input
              type="number"
              value={coordinateInputs.y}
              onChange={handleCoordinateInputChange("y")}
              className={inputClass}
              style={inputStyle}
              placeholder="0"
            />
          </label>
        </div>
        <span className="text-xs" style={descriptionTextStyle}>
          Generates an array literal like [x, y].
        </span>
      </div>
    );
  };

  const filteredSuggestions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return typedSuggestions;
    }
    return typedSuggestions.filter((suggestion) => {
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
  }, [searchTerm, typedSuggestions]);

  const identifierNames = useMemo(() => identifierSuggestions.map((item) => item.name), [identifierSuggestions]);
  const editorBody = manualCoordinatesEnabled ? renderCoordinateEditor() : renderEditor();
  const quickImageExpressions = supportsImageQuickActions ? ["screenshot().image"] : [];

  return (
    <div className="flex flex-col gap-2">
      <div className={clsx("flex items-start", showHeader ? "justify-between" : "justify-end")}
>
        {showHeader ? (
          <div className="flex flex-col">
            <span className={headerTextClass} style={headerTextStyle}>
              {label}
            </span>
            {description ? (
              <span className={descriptionTextClass} style={descriptionTextStyle}>
                {description}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button
              type="button"
              disabled={!hasVariableSuggestions}
              onClick={() => {
                if (!hasVariableSuggestions) {
                  return;
                }
                setPaletteOpen((open) => !open);
              }}
              className={clsx(
                "rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition",
                hasVariableSuggestions
                  ? "hover:border-[var(--editor-color-action)] hover:bg-[var(--editor-color-action-box)]"
                  : "opacity-60 cursor-not-allowed"
              )}
              style={{
                borderColor: editorTheme.colors.borderStrong,
                color: editorTheme.colors.action,
                backgroundColor:
                  hasVariableSuggestions && isPaletteOpen
                    ? editorTheme.colors.actionBox
                    : editorTheme.colors.backgroundDefault,
              }}
            >
              Variables
            </button>
            {hasVariableSuggestions && isPaletteOpen ? (
              <div
                className="absolute right-0 z-30 mt-2 w-56 rounded-xl border p-3 shadow-[0_18px_32px_rgba(10,26,35,0.12)]"
                style={{
                  borderColor: editorTheme.colors.borderSubtle,
                  background: editorTheme.surfaces.card,
                }}
              >
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search variables"
                  className="w-full rounded-md border bg-[var(--editor-color-background-default)] px-2 py-1 text-[12px] outline-none placeholder:text-[var(--editor-color-accent-muted)] focus:border-[var(--editor-color-action)] focus:ring-2 focus:ring-[var(--editor-color-action)]"
                  style={{
                    borderColor: editorTheme.colors.borderStrong,
                    color: editorTheme.colors.foreground,
                  }}
                />
                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {filteredSuggestions.length === 0 ? (
                    <div
                      className="rounded-md border px-2 py-1 text-[11px]"
                      style={{
                        borderColor: editorTheme.colors.borderSubtle,
                        background: editorTheme.colors.backgroundSoft,
                        color: editorTheme.colors.shaded,
                      }}
                    >
                      No matches
                    </div>
                  ) : null}
                  {filteredSuggestions.map((suggestion) => (
                    <div
                      key={`${suggestion.name}-${baseId}`}
                      className="flex flex-col gap-1 rounded-lg border px-2 py-1.5"
                      style={{
                        borderColor: editorTheme.colors.borderSubtle,
                        background: editorTheme.colors.backgroundDefault,
                      }}
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
                        <span className="text-sm font-semibold" style={{ color: editorTheme.colors.foreground }}>
                          {suggestion.name}
                        </span>
                        {suggestion.sourceLabel ? (
                          <span
                            className="text-[10px] uppercase tracking-[0.2em]"
                            style={{ color: editorTheme.colors.accentMuted }}
                          >
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
                              className="rounded-full border px-2 py-0.5 text-[10px] transition hover:border-[var(--editor-color-action)] hover:bg-[var(--editor-color-action-box)]"
                              style={{
                                borderColor: editorTheme.colors.borderStrong,
                                color: editorTheme.colors.action,
                                backgroundColor: editorTheme.colors.backgroundDefault,
                              }}
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
          {showKindSelector ? (
            <select
              value={kind}
              onChange={handleKindChange}
              className={selectClass}
              style={{
                borderColor: editorTheme.colors.borderStrong,
                background: editorTheme.colors.backgroundDefault,
                color: editorTheme.colors.foreground,
              }}
            >
              {allowedKinds.map((optionKind) => (
                <option key={optionKind} value={optionKind}>
                  {EXPRESSION_KIND_LABELS[optionKind] ?? optionKind}
                </option>
              ))}
            </select>
          ) : (
            <span
              className={selectClass}
              style={{
                borderColor: editorTheme.colors.borderStrong,
                background: editorTheme.colors.backgroundDefault,
                color: editorTheme.colors.foreground,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {activeKindLabel}
            </span>
          )}
        </div>
      </div>
      {supportsCoordinateMode ? (
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={switchToExpressionMode}
            className={modeToggleClass}
            style={{
              borderColor: coordinateMode === "auto" ? editorTheme.colors.action : editorTheme.colors.borderStrong,
              color: coordinateMode === "auto" ? editorTheme.colors.action : editorTheme.colors.foreground,
              backgroundColor:
                coordinateMode === "auto"
                  ? editorTheme.colors.actionBox
                  : editorTheme.colors.backgroundDefault,
            }}
          >
            Expression
          </button>
          <button
            type="button"
            onClick={switchToManualCoordinates}
            className={modeToggleClass}
            style={{
              borderColor: coordinateMode === "manual" ? editorTheme.colors.action : editorTheme.colors.borderStrong,
              color: coordinateMode === "manual" ? editorTheme.colors.action : editorTheme.colors.foreground,
              backgroundColor:
                coordinateMode === "manual"
                  ? editorTheme.colors.actionBox
                  : editorTheme.colors.backgroundDefault,
            }}
          >
            Coordinates
          </button>
        </div>
      ) : null}

      {editorBody}
      {quickImageExpressions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="uppercase tracking-[0.2em]" style={{ color: editorTheme.colors.accentMuted }}>
            Quick insert
          </span>
          {quickImageExpressions.map((expression) => (
            <button
              key={expression}
              type="button"
              onClick={() => handleExpressionInsert(expression)}
              className="rounded-full border px-2 py-0.5 transition hover:border-[var(--editor-color-action)] hover:bg-[var(--editor-color-action-box)]"
              style={{
                borderColor: editorTheme.colors.borderStrong,
                color: editorTheme.colors.action,
                backgroundColor: editorTheme.colors.backgroundDefault,
              }}
            >
              {expression}
            </button>
          ))}
        </div>
      ) : null}
      <datalist id={datalistId}>
        {identifierNames.map((identifier) => (
          <option key={identifier} value={identifier} />
        ))}
      </datalist>
    </div>
  );
};

export default ExpressionEditor;
