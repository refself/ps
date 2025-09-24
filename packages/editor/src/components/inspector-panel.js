import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from "react";
import { blockRegistry } from "@workflow-builder/core";
import { useEditorStore } from "../state/editor-store";
import FieldEditor from "./inspector/field-editor";
import { Icon } from "./icon";
const categoryIcons = {
    program: "workflow",
    structure: "branch",
    control: "branch",
    variables: "variable",
    functions: "function",
    expressions: "expression",
    ai: "sparkles",
    automation: "gear",
    utility: "wrench",
    io: "link",
    raw: "box"
};
const categoryColors = {
    program: "#3A5AE5",
    control: "#AF54BE",
    variables: "#E2A636",
    functions: "#32AA81",
    expressions: "#578BC9",
    ai: "#AF54BE",
    automation: "#32AA81",
    utility: "#3A5AE5",
    io: "#578BC9",
    raw: "#CD3A50"
};
const InspectorPanel = () => {
    const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
    const document = useEditorStore((state) => state.document);
    const updateBlockFields = useEditorStore((state) => state.updateBlockFields);
    const duplicateBlock = useEditorStore((state) => state.duplicateBlock);
    const deleteBlock = useEditorStore((state) => state.deleteBlock);
    const selectBlock = useEditorStore((state) => state.selectBlock);
    const effectiveSelectedId = selectedBlockId ?? document.root;
    const pathSegments = useMemo(() => {
        const targetId = document.blocks[effectiveSelectedId] ? effectiveSelectedId : document.root;
        const dfs = (blockId, trail) => {
            if (blockId === targetId) {
                return trail;
            }
            const block = document.blocks[blockId];
            if (!block) {
                return null;
            }
            const schema = blockRegistry.get(block.kind);
            const childSlots = schema?.childSlots ?? [];
            for (const slot of childSlots) {
                const childIds = block.children[slot.id] ?? [];
                for (const childId of childIds) {
                    const nextTrail = [...trail, { blockId: childId, slotLabel: slot.label }];
                    const result = dfs(childId, nextTrail);
                    if (result) {
                        return result;
                    }
                }
            }
            return null;
        };
        const rootTrail = [{ blockId: document.root }];
        if (targetId === document.root) {
            return rootTrail;
        }
        const result = dfs(document.root, rootTrail);
        return result ?? rootTrail;
    }, [document, effectiveSelectedId]);
    if (!selectedBlockId) {
        return (_jsxs("section", { className: "flex h-full flex-1 flex-col border-b border-[#0A1A2314] bg-white/85 p-4 backdrop-blur", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-[#657782]", children: "Inspector" }), _jsx("p", { className: "mt-4 text-sm text-[#657782]", children: "Select a block to configure its properties." })] }));
    }
    const block = document.blocks[selectedBlockId];
    if (!block) {
        return (_jsxs("section", { className: "flex h-full flex-1 flex-col border-b border-[#0A1A2314] bg-white/85 p-4 backdrop-blur", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-[#657782]", children: "Inspector" }), _jsx("p", { className: "mt-4 text-sm text-[#CD3A50]", children: "Selected block not found." })] }));
    }
    const schema = blockRegistry.get(block.kind);
    const fields = schema?.fields ?? [];
    const outputs = schema?.outputs ?? [];
    const category = schema?.category ?? "utility";
    const accent = categoryColors[category] ?? "#3A5AE5";
    const iconName = categoryIcons[category] ?? "workflow";
    const isRoot = block.id === document.root;
    return (_jsxs("section", { className: "flex h-full min-h-0 flex-col overflow-y-auto bg-white/85 backdrop-blur", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-[#0A1A2314] px-6 py-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "flex h-10 w-10 items-center justify-center rounded-xl", style: { backgroundColor: `${accent}14`, color: accent }, children: _jsx(Icon, { name: iconName, className: "h-5 w-5" }) }), _jsxs("div", { className: "flex flex-col", children: [_jsx("h2", { className: "text-sm font-semibold text-[#0A1A23]", children: schema?.label ?? block.kind }), _jsx("span", { className: "text-[11px] uppercase tracking-[0.3em] text-[#657782]", children: block.kind })] })] }), _jsx("div", { className: "flex items-center gap-2", children: !isRoot ? (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => duplicateBlock(block.id), className: "flex h-8 w-8 items-center justify-center rounded-full border border-[#0A1A2333] bg-white text-[#0A1A23] transition hover:border-[#32AA81] hover:text-[#32AA81]", title: "Duplicate block", "aria-label": "Duplicate block", children: _jsx(Icon, { name: "copy", className: "h-3.5 w-3.5" }) }), _jsx("button", { type: "button", onClick: () => deleteBlock(block.id), className: "flex h-8 w-8 items-center justify-center rounded-full border border-[#CD3A50] bg-white text-[#CD3A50] transition hover:bg-[#CD3A5020]", title: "Delete block", "aria-label": "Delete block", children: _jsx(Icon, { name: "trash", className: "h-3.5 w-3.5" }) })] })) : null })] }), _jsx("nav", { className: "flex flex-wrap items-center gap-2 border-b border-[#0A1A2314] bg-white/90 px-6 py-2 text-[11px] text-[#657782]", children: pathSegments.map((segment, index) => {
                    const blockInstance = document.blocks[segment.blockId];
                    const segmentSchema = blockInstance ? blockRegistry.get(blockInstance.kind) : null;
                    const label = segmentSchema?.label ?? blockInstance?.kind ?? segment.blockId;
                    const isCurrent = segment.blockId === effectiveSelectedId;
                    return (_jsxs("div", { className: "flex items-center gap-2", children: [index > 0 ? _jsx("span", { className: "text-[#CED6E9]", children: "/" }) : null, segment.slotLabel ? (_jsx("span", { className: "rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#3A5AE5]", children: segment.slotLabel })) : null, _jsx("button", { type: "button", onClick: () => selectBlock(segment.blockId), className: `rounded-full px-3 py-1 text-xs font-medium transition ${isCurrent ? "bg-[#3A5AE5] text-white" : "bg-white text-[#0A1A23] hover:bg-[#E7EBFF]"}`, children: label })] }, segment.blockId));
                }) }), schema?.description ? (_jsx("div", { className: "border-b border-[#0A1A2314] bg-white px-6 py-3 text-[12px] text-[#465764]", children: schema.description })) : null, outputs.length > 0 ? (_jsxs("div", { className: "flex flex-col gap-2 border-b border-[#0A1A2314] bg-white/85 px-6 py-3", children: [_jsx("h3", { className: "text-[11px] font-semibold uppercase tracking-[0.3em] text-[#9AA7B4]", children: "Outputs" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: outputs.map((output) => (_jsxs("div", { className: "flex min-w-[120px] flex-col gap-0.5 rounded-md border border-[#0A1A2314] bg-white px-2 py-1", children: [_jsx("span", { className: "text-xs font-semibold text-[#0A1A23]", children: output.label }), output.description ? (_jsx("span", { className: "text-[10px] text-[#657782]", children: output.description })) : null] }, output.id))) })] })) : null, _jsx("div", { className: "flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-8 pt-6", children: fields.length === 0 ? (_jsx("p", { className: "text-sm text-[#657782]", children: "This block has no configurable fields." })) : (fields.map((field) => (_jsx(FieldEditor, { field: field, value: block.data[field.id] ?? field.defaultValue ?? "", onChange: (nextValue) => updateBlockFields(selectedBlockId, { [field.id]: nextValue }), contextBlockId: selectedBlockId }, field.id)))) })] }));
};
export { InspectorPanel };
export default InspectorPanel;
