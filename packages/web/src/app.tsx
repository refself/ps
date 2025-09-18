import { HTML5Backend } from "react-dnd-html5-backend";
import { DndProvider } from "react-dnd";

import { EditorProvider } from "./state/editor-provider";
import EditorCanvas from "./components/editor-canvas";
import BlockLibraryPanel from "./components/block-library-panel";
import InspectorPanel from "./components/inspector-panel";
import CodePreviewPanel from "./components/code-preview-panel";
import { EditorHeader } from "./components/editor-header";

const App = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <EditorProvider>
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
          <EditorHeader />
          <div className="flex flex-1 overflow-hidden">
            <BlockLibraryPanel />
            <EditorCanvas />
            <div className="flex w-[360px] flex-col overflow-hidden border-l border-slate-800 bg-slate-900/80 backdrop-blur">
              <InspectorPanel />
              <CodePreviewPanel />
            </div>
          </div>
        </div>
      </EditorProvider>
    </DndProvider>
  );
};

export default App;
