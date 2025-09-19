import { useEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { EditorProvider } from "./state/editor-provider";
import EditorCanvas from "./components/editor-canvas";
import BlockLibraryPanel from "./components/block-library-panel";
import { EditorHeader } from "./components/editor-header";
import WorkflowList from "./components/workflow-list";
import { useEditorStore } from "./state/editor-store";
import { useWorkspaceStore } from "./state/workspace-store";
import InspectorPanel from "./components/inspector-panel";
import CodeEditorPanel from "./components/code-editor-panel";
import ExecutionResultOverlay from "./components/execution-result-overlay";

const App = () => {
  useWorkspaceSynchronization();
  const activeWorkflowId = useWorkspaceStore((state) => state.activeWorkflowId);
  const [mode, setMode] = useState<"visual" | "code">("visual");

  if (!activeWorkflowId) {
    return <WorkflowList />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <EditorProvider>
        <div
          className="flex h-screen w-screen flex-col overflow-hidden bg-[#F5F6F9] text-[#0A1A23]"
          style={{
            background:
              "linear-gradient(0deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.15) 100%), linear-gradient(176deg, #EDEEF6 3%, #F2F0F9 45%, #F0F1F7 100%)"
          }}
        >
          <EditorHeader viewMode={mode} onViewModeChange={setMode} />
          {mode === "code" ? (
            <div className="flex flex-1 overflow-hidden px-10 py-8">
              <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-[#0A1A2314] bg-white shadow-[0_30px_60px_rgba(10,26,35,0.15)]">
                <CodeEditorPanel variant="full" />
              </div>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              <BlockLibraryPanel />
              <EditorCanvas />
              <div className="flex w-[420px] flex-col overflow-hidden border-l border-[#0A1A2314] bg-white/80 backdrop-blur">
                <InspectorPanel />
              </div>
            </div>
          )}
          <ExecutionResultOverlay />
        </div>
      </EditorProvider>
    </DndProvider>
  );
};

export default App;

const useWorkspaceSynchronization = () => {
  const bootstrap = useWorkspaceStore((state) => state.bootstrap);
  const activeWorkflowId = useWorkspaceStore((state) => state.activeWorkflowId);
  const workflows = useWorkspaceStore((state) => state.workflows);
  const loadWorkflowDocument = useEditorStore((state) => state.loadWorkflowDocument);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const lastLoadedId = useRef<string | null>(null);

  useEffect(() => {
    if (!activeWorkflowId) {
      lastLoadedId.current = null;
      return;
    }
    if (lastLoadedId.current === activeWorkflowId) {
      return;
    }
    const workflow = workflows.find((item) => item.id === activeWorkflowId);
    if (!workflow) {
      return;
    }
    lastLoadedId.current = activeWorkflowId;
    loadWorkflowDocument({ document: workflow.document, code: workflow.code });
  }, [activeWorkflowId, workflows, loadWorkflowDocument]);
};
