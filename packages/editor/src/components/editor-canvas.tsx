import { useMemo } from "react";
import { useDrop } from "react-dnd";

import BlockNode from "./canvas/block-node";
import SlotDropZone from "./canvas/slot-drop-zone";

import { DND_ITEM_TYPES, type BlockDragItem } from "../dnd/item-types";
import { useEditorStore } from "../state/editor-store";

const EditorCanvas = () => {
  const document = useEditorStore((state) => state.document);
  const addBlock = useEditorStore((state) => state.addBlock);
  const rootBody = useMemo(() => document.blocks[document.root]?.children.body ?? [], [document]);

  const [, dropRef] = useDrop({
    accept: DND_ITEM_TYPES.BLOCK,
    drop: (item: BlockDragItem) => {
      if (item.source === "palette") {
        addBlock({ kind: item.kind, parentId: document.root, slotId: "body" });
      }
    }
  });

  return (
    <div ref={dropRef} className="workflow-editor-scrollable flex-1 overflow-auto bg-workbench">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-10 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-[#3A5AE5] bg-[#3A5AE510] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#3A5AE5]">
              Canvas
            </span>
            <span className="text-sm text-[#657782]">Drag and drop blocks to compose your workflow.</span>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <SlotDropZone
            parentId={document.root}
            slotId="body"
            index={0}
            depth={0}
            label={rootBody.length === 0 ? "Drop a block to start" : "Insert at beginning"}
            isEmpty={rootBody.length === 0}
          />
          {rootBody.map((blockId, index) => (
            <div key={blockId} className="flex flex-col gap-3">
              <BlockNode blockId={blockId} depth={0} />
              <SlotDropZone
                parentId={document.root}
                slotId="body"
                index={index + 1}
                depth={0}
                label="Insert here"
                isEmpty={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { EditorCanvas };
export default EditorCanvas;
