import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { useDrag } from "react-dnd";
import { blockRegistry } from "@workflow-builder/core";
import { useEditorStore } from "../state/editor-store";
import { DND_ITEM_TYPES } from "../dnd/item-types";
import { Icon } from "./icon";
const categoryIcons = {
    program: "workflow",
    control: "branch",
    variables: "variable",
    functions: "function",
    expressions: "expression",
    automation: "gear",
    ai: "sparkles",
    utility: "wrench",
    io: "link",
    raw: "box"
};
const BlockPaletteItem = ({ item, onAdd }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: DND_ITEM_TYPES.BLOCK,
        item: { source: "palette", kind: item.kind },
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        })
    }));
    return (_jsxs("button", { ref: drag, type: "button", onClick: () => onAdd(item.kind), className: "flex w-full items-start gap-3 rounded-xl border border-[#0A1A2314] bg-white px-3 py-3 text-left text-sm text-[#0A1A23] shadow-sm transition hover:border-[#3A5AE5] hover:shadow-[0_12px_24px_rgba(58,90,229,0.12)]", style: { opacity: isDragging ? 0.4 : 1 }, children: [_jsx("span", { className: "mt-1 flex h-7 w-7 items-center justify-center rounded-lg bg-[#3A5AE510] text-[#3A5AE5]", children: _jsx(Icon, { name: item.icon, className: "h-4 w-4" }) }), _jsxs("div", { className: "flex flex-1 flex-col gap-1", children: [_jsx("span", { className: "font-semibold", children: item.label }), item.description ? _jsx("span", { className: "text-xs text-[#657782]", children: item.description }) : null] })] }));
};
const categoryLabels = {
    program: "Program",
    structure: "Structure",
    control: "Control",
    variables: "Variables",
    functions: "Functions",
    expressions: "Expressions",
    io: "I/O",
    ai: "AI",
    automation: "Automation",
    utility: "Utility",
    raw: "Raw"
};
const BlockLibraryPanel = () => {
    const rootId = useEditorStore((state) => state.document.root);
    const addBlock = useEditorStore((state) => state.addBlock);
    const groups = useMemo(() => {
        const byCategory = new Map();
        blockRegistry
            .list()
            .filter((schema) => schema.kind !== "program")
            .forEach((schema) => {
            const label = categoryLabels[schema.category] ?? schema.category;
            if (!byCategory.has(schema.category)) {
                byCategory.set(schema.category, {
                    category: label,
                    icon: categoryIcons[schema.category] ?? "workflow",
                    items: []
                });
            }
            const icon = schema.icon ?? categoryIcons[schema.category] ?? "workflow";
            byCategory.get(schema.category)?.items.push({
                kind: schema.kind,
                label: schema.label,
                description: schema.description,
                icon
            });
        });
        return Array.from(byCategory.values()).sort((a, b) => a.category.localeCompare(b.category));
    }, []);
    const handleAdd = (kind) => {
        addBlock({
            kind,
            parentId: rootId,
            slotId: "body"
        });
    };
    return (_jsxs("aside", { className: "workflow-editor-scrollable flex h-full w-72 flex-col border-r border-[#0A1A2314] bg-white/85 backdrop-blur", children: [_jsx("div", { className: "border-b border-[#0A1A2314] bg-white/90 px-4 py-4", children: _jsx("h2", { className: "text-sm font-semibold uppercase tracking-[0.35em] text-[#657782]", children: "Blocks" }) }), _jsx("div", { className: "mt-4 flex-1 space-y-5 overflow-y-auto px-4 pb-6", children: groups.map((group) => (_jsxs("section", { className: "flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-center justify-between pr-1", children: [_jsxs("h3", { className: "flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#657782]", children: [_jsx(Icon, { name: group.icon, className: "h-4 w-4 text-[#3A5AE5]" }), group.category] }), _jsx("span", { className: "rounded-full border border-[#0A1A2314] bg-white px-2 py-0.5 text-[10px] text-[#657782]", children: group.items.length })] }), _jsx("div", { className: "flex flex-col gap-2", children: group.items.map((item) => (_jsx(BlockPaletteItem, { item: item, onAdd: handleAdd }, item.kind))) })] }, group.category))) })] }));
};
export default BlockLibraryPanel;
