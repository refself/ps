import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { useDrag } from "react-dnd";
import { blockRegistry } from "@workflow-builder/core";
import { DND_ITEM_TYPES } from "../../dnd/item-types";
import { useEditorStore } from "../../state/editor-store";
import SlotDropZone from "./slot-drop-zone";
import { getIdentifierStyle } from "../../utils/identifier-colors";
import { Icon } from "../icon";
const categoryIcons = {
    program: "📜",
    control: "🔁",
    variables: "🔣",
    functions: "🧩",
    expressions: "🧮",
    ai: "✨",
    automation: "⚙️",
    utility: "🛠",
    io: "🔗",
    raw: "📦"
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
const BlockNode = ({ blockId, depth }) => {
    const block = useEditorStore((state) => state.document.blocks[blockId]);
    const selectBlock = useEditorStore((state) => state.selectBlock);
    const deleteBlock = useEditorStore((state) => state.deleteBlock);
    const duplicateBlock = useEditorStore((state) => state.duplicateBlock);
    const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
    const schema = useMemo(() => (block ? blockRegistry.get(block.kind) : null), [block]);
    const childSlots = schema?.childSlots ?? [];
    const [isHovered, setIsHovered] = useState(false);
    const [{ isDragging }, dragRef] = useDrag(() => ({
        type: DND_ITEM_TYPES.BLOCK,
        item: { source: "canvas", blockId },
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        })
    }), [blockId]);
    if (!block) {
        return null;
    }
    const category = schema?.category ?? "utility";
    const accentColor = categoryColors[category] ?? "#3A5AE5";
    const iconBackground = `${accentColor}1A`;
    const fields = schema?.fields ?? [];
    const identifierLabel = typeof block.data.identifier === "string" && block.data.identifier.trim() !== ""
        ? block.data.identifier.trim()
        : null;
    const cardClassName = clsx("relative flex cursor-pointer flex-col gap-3 rounded-xl border border-[#0A1A2314] bg-white px-5 py-4 text-sm shadow-[0_18px_32px_rgba(10,26,35,0.08)] transition-[box-shadow,transform] duration-150", isDragging ? "opacity-60 scale-[0.99]" : "opacity-100");
    const cardStyle = {};
    if (selectedBlockId === blockId) {
        cardStyle.boxShadow = `0 0 0 2px ${accentColor}33, 0 28px 48px rgba(10,26,35,0.16)`;
    }
    if (isHovered) {
        cardStyle.boxShadow = selectedBlockId === blockId
            ? `0 0 0 2px ${accentColor}66, 0 32px 52px rgba(10,26,35,0.18)`
            : `0 0 0 1px ${accentColor}3d, 0 24px 40px rgba(10,26,35,0.12)`;
        cardStyle.transform = "translateY(-2px)";
        cardStyle.zIndex = 5;
    }
    const handleSelect = (event) => {
        event.stopPropagation();
        selectBlock(blockId);
    };
    return (_jsxs("div", { className: "relative", style: { marginLeft: depth * 18 }, children: [depth > 0 ? (_jsx("span", { "aria-hidden": true, className: "absolute top-5 bottom-5 w-px bg-[#0A1A2333]", style: { left: -12 } })) : null, _jsxs("div", { ref: dragRef, className: cardClassName, style: cardStyle, onClick: handleSelect, onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), children: [_jsxs("header", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: "flex h-10 w-10 items-center justify-center rounded-xl text-lg", style: { backgroundColor: iconBackground, color: accentColor }, children: categoryIcons[category] ?? "🧱" }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("div", { className: "text-[16px] font-semibold text-[#0A1A23]", children: schema?.label ?? block.kind }), _jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [_jsx("span", { className: "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", style: { backgroundColor: `${accentColor}16`, color: accentColor }, children: block.kind }), identifierLabel ? ((() => {
                                                        const style = getIdentifierStyle(identifierLabel);
                                                        return (_jsxs("span", { className: clsx("rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", style.chip, style.text), children: ["Stores ", identifierLabel] }));
                                                    })()) : null] }), schema?.description ? (_jsx("p", { className: "text-[12px] text-[#657782]", children: schema.description })) : null] })] }), _jsxs("div", { className: "flex items-center gap-1.5 text-[#657782]", children: [_jsx("button", { type: "button", onClick: (event) => {
                                            event.stopPropagation();
                                            duplicateBlock(blockId);
                                        }, className: "flex h-8 w-8 items-center justify-center rounded-full border border-[#0A1A2333] bg-white transition hover:border-[#32AA81] hover:text-[#32AA81]", "aria-label": "Duplicate block", children: _jsx(Icon, { name: "copy", className: "h-3.5 w-3.5", title: "Duplicate" }) }), _jsx("button", { type: "button", onClick: (event) => {
                                            event.stopPropagation();
                                            deleteBlock(blockId);
                                        }, className: "flex h-8 w-8 items-center justify-center rounded-full border border-[#CD3A50] bg-white text-[#CD3A50] transition hover:bg-[#CD3A5020]", "aria-label": "Delete block", children: _jsx(Icon, { name: "trash", className: "h-3.5 w-3.5", title: "Delete" }) })] })] }), fields.length > 0 ? (_jsxs("dl", { className: "grid grid-cols-1 gap-1 text-[12px] text-[#465764]", children: [fields.slice(0, 3).map((field) => {
                                const rawValue = block.data[field.id];
                                const value = typeof rawValue === "string"
                                    ? rawValue
                                    : typeof rawValue === "boolean"
                                        ? String(rawValue)
                                        : rawValue === undefined && field.defaultValue !== undefined
                                            ? String(field.defaultValue)
                                            : rawValue
                                                ? JSON.stringify(rawValue)
                                                : "—";
                                return (_jsxs("div", { className: "flex items-center gap-2 overflow-hidden", children: [_jsx("dt", { className: "shrink-0 text-[11px] uppercase tracking-wide text-[#9AA7B4]", children: field.label }), _jsx("dd", { className: "truncate", title: String(value), children: String(value) })] }, field.id));
                            }), fields.length > 3 ? (_jsxs("div", { className: "text-[11px] uppercase tracking-wide text-[#9AA7B4]", children: ["+", fields.length - 3, " more"] })) : null] })) : null, childSlots.length > 0 ? (_jsx("div", { className: "flex flex-col gap-2", children: childSlots.map((slot) => {
                            const childIds = block.children[slot.id] ?? [];
                            return (_jsxs("div", { className: "rounded-xl border border-[#0A1A2314] bg-[#F5F6F9] p-2.5", children: [_jsxs("div", { className: "flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-[#657782]", children: [_jsx("span", { children: slot.label }), _jsx("span", { className: "text-[#9AA7B4]", children: childIds.length })] }), _jsxs("div", { className: "mt-2 flex flex-col gap-2", children: [_jsx(SlotDropZone, { parentId: blockId, slotId: slot.id, index: 0, depth: depth + 1, label: childIds.length === 0 ? "Drop a block here" : "Insert at start", isEmpty: childIds.length === 0 }), childIds.map((childId, childIndex) => (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(BlockNode, { blockId: childId, depth: depth + 1 }), _jsx(SlotDropZone, { parentId: blockId, slotId: slot.id, index: childIndex + 1, depth: depth + 1, label: "Insert here", isEmpty: false })] }, childId)))] })] }, slot.id));
                        }) })) : null] })] }));
};
export default BlockNode;
