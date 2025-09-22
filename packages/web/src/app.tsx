import { useCallback, useEffect, useMemo, useRef } from "react";

import { WorkflowEditor } from "@workflow-builder/editor";
import type { WorkflowDocument } from "@workflow-builder/core";

import WorkflowList from "./components/workflow-list";
import { useWorkspaceStore, useActiveWorkflow } from "./state/workspace-store";
import { executeWorkflowScript } from "./services/execute-script-service";
import { useExecuteConnection } from "./hooks/use-execute-connection";

const App = () => {
  useWorkspaceSynchronization();
  const activeWorkflow = useActiveWorkflow();
  const connectionState = useExecuteConnection();
  const updateActiveWorkflow = useWorkspaceStore((state) => state.updateActiveWorkflow);
  const clearActiveWorkflow = useWorkspaceStore((state) => state.clearActiveWorkflow);
  const saveWorkflowVersion = useWorkspaceStore((state) => state.saveWorkflowVersion);
  const restoreWorkflowVersion = useWorkspaceStore((state) => state.restoreWorkflowVersion);
  const renameWorkflowVersion = useWorkspaceStore((state) => state.renameWorkflowVersion);
  const deleteWorkflowVersion = useWorkspaceStore((state) => state.deleteWorkflowVersion);

  const latestDocumentRef = useRef(activeWorkflow?.document ?? null);
  const latestCodeRef = useRef(activeWorkflow?.code ?? "");

  useEffect(() => {
    latestDocumentRef.current = activeWorkflow?.document ?? null;
    latestCodeRef.current = activeWorkflow?.code ?? "";
  }, [activeWorkflow?.document, activeWorkflow?.code, activeWorkflow?.id]);

  const handleDocumentChange = useCallback(
    (next: WorkflowDocument) => {
      latestDocumentRef.current = next;
      updateActiveWorkflow({ document: next, code: latestCodeRef.current });
    },
    [updateActiveWorkflow]
  );

  const handleCodeChange = useCallback(
    (next: string) => {
      latestCodeRef.current = next;
      const document = latestDocumentRef.current ?? activeWorkflow?.document;
      if (document) {
        updateActiveWorkflow({ document, code: next });
      }
    },
    [activeWorkflow?.document, updateActiveWorkflow]
  );

  const handleRunScript = useCallback(async (workflowCode: string) => {
    return executeWorkflowScript(workflowCode);
  }, []);

  const connectionStatus = connectionState === null ? "checking" : connectionState ? "online" : "offline";

  const versionDescriptors = useMemo(() => {
    if (!activeWorkflow || !activeWorkflow.versions) {
      return [];
    }
    return activeWorkflow.versions.map((version) => ({
      id: version.id,
      name: version.name,
      createdAt: version.createdAt,
      isNamed: version.isNamed
    }));
  }, [activeWorkflow]);

  const handleSaveVersion = useCallback(
    ({ name, document, code }: { name?: string; document: WorkflowDocument; code: string }) => {
      if (!activeWorkflow) {
        return;
      }
      saveWorkflowVersion({ workflowId: activeWorkflow.id, name, document, code });
    },
    [activeWorkflow, saveWorkflowVersion]
  );

  const handleRestoreVersion = useCallback(
    (versionId: string) => {
      if (!activeWorkflow) {
        return;
      }
      restoreWorkflowVersion({ workflowId: activeWorkflow.id, versionId });
    },
    [activeWorkflow, restoreWorkflowVersion]
  );

  const handleRenameVersion = useCallback(
    ({ versionId, name }: { versionId: string; name: string }) => {
      if (!activeWorkflow) {
        return;
      }
      renameWorkflowVersion({ workflowId: activeWorkflow.id, versionId, name });
    },
    [activeWorkflow, renameWorkflowVersion]
  );

  const handleDeleteVersion = useCallback(
    (versionId: string) => {
      if (!activeWorkflow) {
        return;
      }
      deleteWorkflowVersion({ workflowId: activeWorkflow.id, versionId });
    },
    [activeWorkflow, deleteWorkflowVersion]
  );

  if (!activeWorkflow) {
    return <WorkflowList />;
  }

  return (
    <WorkflowEditor
      document={activeWorkflow.document}
      code={activeWorkflow.code}
      onDocumentChange={handleDocumentChange}
      onCodeChange={handleCodeChange}
      onRunScript={handleRunScript}
      onBack={clearActiveWorkflow}
      connectionStatus={connectionStatus}
      versioning={{
        versions: versionDescriptors,
        activeVersionId: activeWorkflow.lastRestoredVersionId,
        onSaveVersion: handleSaveVersion,
        onRestoreVersion: handleRestoreVersion,
        onRenameVersion: handleRenameVersion,
        onDeleteVersion: handleDeleteVersion
      }}
      enableCommandPalette
      enableUndoRedo
      className="h-screen w-screen"
    />
  );
};

export default App;

const useWorkspaceSynchronization = () => {
  const bootstrap = useWorkspaceStore((state) => state.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);
};
