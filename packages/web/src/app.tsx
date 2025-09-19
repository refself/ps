import { useEffect, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { EditorProvider } from "./state/editor-provider";
import EditorCanvas from "./components/editor-canvas";
import BlockLibraryPanel from "./components/block-library-panel";
import InspectorPanel from "./components/inspector-panel";
import CodePreviewPanel from "./components/code-preview-panel";
import { EditorHeader } from "./components/editor-header";
import WorkflowList from "./components/workflow-list";
import { useEditorStore } from "./state/editor-store";
import { useWorkspaceStore } from "./state/workspace-store";

const App = () => {
  useWorkspaceSynchronization();
  const activeWorkflowId = useWorkspaceStore((state) => state.activeWorkflowId);

  if (!activeWorkflowId) {
    return <WorkflowList />;
  }

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
