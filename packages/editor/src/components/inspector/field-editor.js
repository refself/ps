import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useEditorStore } from "../../state/editor-store";
import ExpressionEditor from "./expression-editor";
import JsonSchemaEditor from "./json-schema-editor";
const FieldEditor = ({ field, value, onChange, contextBlockId }) => {
    const input = field.input;
    const fallbackValue = field.defaultValue;
    const contextBlockKind = useEditorStore((state) => contextBlockId ? state.document.blocks[contextBlockId]?.kind : undefined);
    const enableQuickSchemaBuilder = useMemo(() => contextBlockKind === "ai-call" || contextBlockKind === "vision-call", [contextBlockKind]);
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
        return () => { };
    }, [isSchemaModalOpen]);
    if (input.kind === "boolean") {
        const checked = typeof value === "boolean" ? value : Boolean(fallbackValue);
        return (_jsxs("label", { className: "flex items-center justify-between rounded-xl border border-[#0A1A2314] bg-white px-3 py-2 text-sm text-[#0A1A23] shadow-[0_12px_20px_rgba(10,26,35,0.08)]", children: [_jsxs("span", { className: "flex flex-col", children: [_jsx("span", { className: "font-medium text-[#0A1A23]", children: field.label }), field.description ? _jsx("span", { className: "text-xs text-[#657782]", children: field.description }) : null] }), _jsx("input", { type: "checkbox", checked: checked, onChange: (event) => onChange(event.target.checked), className: "h-4 w-4 rounded border-[#0A1A2333] text-[#3A5AE5] focus:ring-[#3A5AE5]" })] }));
    }
    if (input.kind === "number") {
        const numericValue = typeof value === "number" || typeof value === "string"
            ? String(value)
            : typeof fallbackValue === "number" || typeof fallbackValue === "string"
                ? String(fallbackValue)
                : "";
        return (_jsxs("label", { className: "flex flex-col gap-2 text-sm text-[#0A1A23]", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "font-medium text-[#0A1A23]", children: field.label }), field.description ? _jsx("span", { className: "text-xs text-[#657782]", children: field.description }) : null] }), _jsx("input", { type: "number", value: numericValue, min: input.min, max: input.max, step: input.step ?? 1, onChange: (event) => {
                        const next = event.target.value;
                        if (next === "") {
                            onChange(undefined);
                        }
                        else {
                            onChange(Number(next));
                        }
                    }, className: "w-full rounded border border-[#0A1A2333] bg-white p-2 text-sm text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]" })] }));
    }
    if (input.kind === "enum") {
        const stringValue = typeof value === "string" ? value : (typeof fallbackValue === "string" ? fallbackValue : "");
        return (_jsxs("label", { className: "flex flex-col gap-2 text-sm text-[#0A1A23]", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "font-medium text-[#0A1A23]", children: field.label }), field.description ? _jsx("span", { className: "text-xs text-[#657782]", children: field.description }) : null] }), _jsxs("select", { value: stringValue, onChange: (event) => onChange(event.target.value), className: "w-full rounded border border-[#0A1A2333] bg-white p-2 text-sm text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]", children: [_jsx("option", { value: "", disabled: true, children: "Select\u2026" }), input.options.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value)))] })] }));
    }
    if (input.kind === "identifier") {
        const identifierValue = typeof value === "string" ? value : (typeof fallbackValue === "string" ? fallbackValue : "");
        return (_jsxs("label", { className: "flex flex-col gap-2 text-sm text-[#0A1A23]", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "font-medium text-[#0A1A23]", children: field.label }), field.description ? _jsx("span", { className: "text-xs text-[#657782]", children: field.description }) : null] }), _jsx("input", { value: identifierValue, onChange: (event) => onChange(event.target.value), className: "w-full rounded border border-[#0A1A2333] bg-white p-2 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]", placeholder: "identifier" })] }));
    }
    if (input.kind === "string") {
        const stringValue = typeof value === "string" ? value : (typeof fallbackValue === "string" ? fallbackValue : "");
        if (input.multiline) {
            return (_jsxs("label", { className: "flex flex-col gap-2 text-sm text-[#0A1A23]", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "font-medium text-[#0A1A23]", children: field.label }), field.description ? _jsx("span", { className: "text-xs text-[#657782]", children: field.description }) : null] }), _jsx("textarea", { value: stringValue, onChange: (event) => onChange(event.target.value), rows: 4, className: "w-full rounded border border-[#0A1A2333] bg-white p-2 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]", placeholder: input.placeholder })] }));
        }
        return (_jsxs("label", { className: "flex flex-col gap-2 text-sm text-[#0A1A23]", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "font-medium text-[#0A1A23]", children: field.label }), field.description ? _jsx("span", { className: "text-xs text-[#657782]", children: field.description }) : null] }), _jsx("input", { value: stringValue, onChange: (event) => onChange(event.target.value), className: "w-full rounded border border-[#0A1A2333] bg-white p-2 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]", placeholder: input.placeholder })] }));
    }
    if (input.kind === "code" || input.kind === "expression") {
        const preferCustomEditor = input.kind === "code";
        const language = input.kind === "code" ? input.language : undefined;
        const placeholder = input.kind === "code" ? input.placeholder : undefined;
        return (_jsx("div", { className: "rounded-xl border border-[#0A1A2314] bg-white p-3 shadow-[0_18px_32px_rgba(10,26,35,0.08)]", children: _jsx(ExpressionEditor, { value: typeof value === "string" ? value : typeof fallbackValue === "string" ? fallbackValue : "", onChange: (expression) => onChange(expression), label: field.label, description: field.description, contextBlockId: contextBlockId, preferCustomEditor: preferCustomEditor, language: language, placeholder: placeholder }) }));
    }
    if (input.kind === "json-schema") {
        const schemaValue = typeof value === "string" ? value : typeof fallbackValue === "string" ? fallbackValue : "";
        return (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("button", { type: "button", onClick: () => setSchemaModalOpen(true), className: "self-start rounded-lg border border-[#0A1A2333] bg-white px-3 py-2 text-sm text-[#0A1A23] shadow-sm transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]", children: "edit schema" }), schemaValue ? (_jsx("pre", { className: "max-h-48 overflow-auto rounded-lg border border-[#0A1A2314] bg-[#F8FAFF] p-3 text-xs text-[#465764]", children: schemaValue })) : (_jsx("div", { className: "rounded-lg border border-dashed border-[#0A1A2333] bg-[#F8FAFF] p-3 text-xs text-[#657782]", children: "No schema defined yet." })), isSchemaModalOpen && typeof document !== "undefined"
                    ? createPortal(_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-6", children: _jsxs("div", { className: "flex w-full max-w-3xl max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_32px_72px_rgba(10,26,35,0.18)]", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-[#0A1A2314] px-6 py-4", children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-lg font-semibold text-[#0A1A23]", children: field.label }), field.description ? (_jsx("span", { className: "text-sm text-[#657782]", children: field.description })) : null] }), _jsx("button", { type: "button", onClick: () => setSchemaModalOpen(false), className: "rounded-md border border-[#0A1A2333] px-3 py-1.5 text-sm text-[#0A1A23] transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]", children: "close" })] }), _jsx("div", { className: "flex flex-1 flex-col overflow-hidden bg-[#F5F6F9] p-6", children: _jsx("div", { className: "flex-1 overflow-auto rounded-xl border border-[#0A1A2314] bg-white p-4 shadow-inner", children: _jsx(JsonSchemaEditor, { value: schemaValue, onChange: (next) => onChange(next), label: "schema", enableQuickBuilder: enableQuickSchemaBuilder }) }) })] }) }), document.body)
                    : null] }));
    }
    return (_jsxs("label", { className: "flex flex-col gap-2 text-sm text-[#0A1A23]", children: [_jsx("span", { className: "font-medium", children: field.label }), _jsx("span", { className: "text-xs text-[#657782]", children: "Unsupported field type" })] }));
};
export default FieldEditor;
