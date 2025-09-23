import { useCallback, useEffect, useMemo, useRef } from "react";

import { WorkflowEditor, type ObservabilityConfig } from "@workflow-builder/editor";
import type { WorkflowDocument } from "@workflow-builder/core";

import WorkflowList from "./components/workflow-list";
import { useWorkspaceStore, useActiveWorkflow } from "./state/workspace-store";
import { executeWorkflowScript } from "./services/execute-script-service";
import { useExecuteConnection } from "./hooks/use-execute-connection";
import { WORKER_BASE_URL } from "./services/workflow-api";

const API_KEY = (import.meta.env.VITE_WORKER_API_KEY ?? "").trim() || undefined;

const App = () => {
  useWorkspaceSynchronization();
  const activeWorkflow = useActiveWorkflow();
  const connectionInfo = useExecuteConnection(activeWorkflow?.id ?? null);
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

  const handleRunScript = useCallback(async (_workflowCode: string) => {
    if (!activeWorkflow) {
      return { ok: false, error: "Workflow not selected." };
    }
    return executeWorkflowScript({ workflowId: activeWorkflow.id });
  }, [activeWorkflow?.id]);

  const connectionStatus = connectionInfo.checking
    ? "checking"
    : connectionInfo.hasOSClient
      ? "online"
      : "offline";

  const versionDescriptors = useMemo(() => {
    if (!activeWorkflow || !activeWorkflow.versions) {
      return [];
    }
    return activeWorkflow.versions.map((version) => ({
      id: version.id,
      name: version.name,
      createdAt: version.createdAtIso,
      isNamed: version.isNamed
    }));
  }, [activeWorkflow]);

  const observabilityConfig = useMemo<ObservabilityConfig | undefined>(() => {
    if (!activeWorkflow || !WORKER_BASE_URL) {
      return undefined;
    }
    return {
      workflowId: activeWorkflow.id,
      baseUrl: WORKER_BASE_URL,
      apiKey: API_KEY,
    };
  }, [activeWorkflow?.id]);

  const handleSaveVersion = useCallback(
    ({ name, document, code }: { name?: string; document: WorkflowDocument; code: string }) => {
      if (!activeWorkflow) {
        return;
      }
      void saveWorkflowVersion({ workflowId: activeWorkflow.id, name, document, code });
    },
    [activeWorkflow, saveWorkflowVersion]
  );

  const handleRestoreVersion = useCallback(
    (versionId: string) => {
      if (!activeWorkflow) {
        return;
      }
      void restoreWorkflowVersion({ workflowId: activeWorkflow.id, versionId });
    },
    [activeWorkflow, restoreWorkflowVersion]
  );

  const handleRenameVersion = useCallback(
    ({ versionId, name }: { versionId: string; name: string }) => {
      if (!activeWorkflow) {
        return;
      }
      void renameWorkflowVersion({ workflowId: activeWorkflow.id, versionId, name });
    },
    [activeWorkflow, renameWorkflowVersion]
  );

  const handleDeleteVersion = useCallback(
    (versionId: string) => {
      if (!activeWorkflow) {
        return;
      }
      void deleteWorkflowVersion({ workflowId: activeWorkflow.id, versionId });
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
      observability={observabilityConfig}
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
    void bootstrap();
  }, [bootstrap]);
};
