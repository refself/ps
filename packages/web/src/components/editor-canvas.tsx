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
    <div ref={dropRef} className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-10 py-10">
        <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Workflow</div>
        <div className="flex flex-col gap-3">
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
