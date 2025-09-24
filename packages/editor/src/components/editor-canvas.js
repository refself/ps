import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { useDrop } from "react-dnd";
import BlockNode from "./canvas/block-node";
import SlotDropZone from "./canvas/slot-drop-zone";
import { DND_ITEM_TYPES } from "../dnd/item-types";
import { useEditorStore } from "../state/editor-store";
const EditorCanvas = () => {
    const document = useEditorStore((state) => state.document);
    const addBlock = useEditorStore((state) => state.addBlock);
    const rootBody = useMemo(() => document.blocks[document.root]?.children.body ?? [], [document]);
    const [, dropRef] = useDrop({
        accept: DND_ITEM_TYPES.BLOCK,
        drop: (item) => {
            if (item.source === "palette") {
                addBlock({ kind: item.kind, parentId: document.root, slotId: "body" });
            }
        }
    });
    return (_jsx("div", { ref: dropRef, className: "workflow-editor-scrollable flex-1 overflow-auto bg-workbench", children: _jsxs("div", { className: "mx-auto flex w-full max-w-6xl flex-col gap-6 px-10 py-10", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "rounded-full border border-[#3A5AE5] bg-[#3A5AE510] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#3A5AE5]", children: "Canvas" }), _jsx("span", { className: "text-sm text-[#657782]", children: "Drag and drop blocks to compose your workflow." })] }) }), _jsxs("div", { className: "flex flex-col gap-4", children: [_jsx(SlotDropZone, { parentId: document.root, slotId: "body", index: 0, depth: 0, label: rootBody.length === 0 ? "Drop a block to start" : "Insert at beginning", isEmpty: rootBody.length === 0 }), rootBody.map((blockId, index) => (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx(BlockNode, { blockId: blockId, depth: 0 }), _jsx(SlotDropZone, { parentId: document.root, slotId: "body", index: index + 1, depth: 0, label: "Insert here", isEmpty: false })] }, blockId)))] })] }) }));
};
export { EditorCanvas };
export default EditorCanvas;
