import { useEffect, useMemo, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import "./styles.css";

import CommandPalette from "./components/command-palette";
import ExecutionResultOverlay from "./components/execution-result-overlay";
import VersionHistoryDrawer from "./components/version-history-drawer";
import WorkflowEditorHeader from "./components/workflow-editor-header";
import WorkflowEditorViewContainer from "./components/workflow-editor-view-container";
import { EditorProvider } from "./state/editor-provider";
import { useEditorStore } from "./state/editor-store";
import {
  clearEditorExternalListeners,
  setEditorExternalListeners
} from "./state/external-listeners";
import { useObservability } from "./hooks/use-observability";
import { useRecording } from "./hooks/use-recording";
import { useExecution } from "./hooks/use-execution";
import { useVersioning } from "./hooks/use-versioning";
import { useDocument } from "./hooks/use-document";
import type { WorkflowEditorProps, EditorMode } from "./types/workflow-editor";

const WorkflowEditor = ({
  document,
  code,
  onDocumentChange,
  onCodeChange,
  onRunScript,
  onAbortScript,
  onBack,
  connectionStatus = "online",
  enableCommandPalette = false,
  enableUndoRedo = false,
  versioning,
  initialView = "visual",
  className,
  observability,
  onStartRecording,
  onStopRecording,
  activeRecordingId,
  recordingError,
  recordingBusy: externalRecordingBusy,
  recordings,
}: WorkflowEditorProps) => {
  const [mode, setMode] = useState<EditorMode>(initialView);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);

  // Custom hooks
  const { documentName, handleRename } = useDocument(document, code);
  const { busy: internalRecordingBusy, startRecording, stopRecording } = useRecording({
    onStartRecording,
    onStopRecording,
  });
  const recordingBusy = externalRecordingBusy || internalRecordingBusy;
  const { executionStatus, runScript, abortScript, canAbortScript } = useExecution({
    onRunScript,
    onAbortScript,
    isRunnable: Boolean(onRunScript) && connectionStatus === "online",
  });
  const { createVersion, restoreVersion, renameVersion, deleteVersion } = useVersioning(versioning);

  // Editor store state
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
  const duplicateBlock = useEditorStore((state) => state.duplicateBlock);

  // Observability setup
  const observabilityConfig = useMemo(() => {
    if (!observability) {
      return undefined;
    }
    const { workflowId, baseUrl, apiKey, pollIntervalMs } = observability;
    if (!workflowId || !baseUrl) {
      return undefined;
    }
    return { workflowId, baseUrl, apiKey, pollIntervalMs };
  }, [observability?.workflowId, observability?.baseUrl, observability?.apiKey, observability?.pollIntervalMs]);

  const observabilityState = useObservability(observabilityConfig);

  // Effects
  useEffect(() => {
    setEditorExternalListeners({
      onDocumentChange,
      onCodeChange
    });
    return () => {
      clearEditorExternalListeners();
    };
  }, [onDocumentChange, onCodeChange]);

  useEffect(() => {
    setMode(initialView);
  }, [initialView]);

  useEffect(() => {
    if (!versioning) {
      setIsVersionHistoryOpen(false);
    }
  }, [versioning]);

  // Computed values
  const canRunScript = Boolean(onRunScript);
  const isRunnable = canRunScript && connectionStatus === "online";
  return (
    <DndProvider backend={HTML5Backend}>
      <EditorProvider>
        <div
          className={`workflow-editor-root flex h-full w-full flex-col overflow-hidden ${className ?? ""}`}
        >
          <WorkflowEditorHeader
            mode={mode}
            setMode={setMode}
            onBack={onBack}
            connectionStatus={connectionStatus}
            enableCommandPalette={enableCommandPalette}
            enableUndoRedo={enableUndoRedo}
            versioning={versioning}
          setIsVersionHistoryOpen={setIsVersionHistoryOpen}
          onRunScript={runScript}
          canRunScript={canRunScript}
          isRunnable={isRunnable}
          executionState={executionStatus.state}
            documentName={documentName}
            onRename={handleRename}
            selectedBlockId={selectedBlockId}
            onDuplicateBlock={duplicateBlock}
            observabilityConfig={observabilityConfig}
          />
          <WorkflowEditorViewContainer
            mode={mode}
            observabilityConfig={observabilityConfig}
            observabilityState={observabilityState}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            recordingBusy={recordingBusy}
            activeRecordingId={activeRecordingId}
            recordingError={recordingError}
            recordings={recordings}
          />
        </div>
        {enableCommandPalette ? <CommandPalette /> : null}
        {versioning ? (
          <VersionHistoryDrawer
            open={isVersionHistoryOpen}
            onClose={() => setIsVersionHistoryOpen(false)}
            versions={versioning.versions}
            activeVersionId={versioning.activeVersionId}
            onSaveVersion={({ name }) => createVersion(name)}
            onRestoreVersion={(versionId) => restoreVersion(versionId)}
            onRenameVersion={
              versioning.onRenameVersion
                ? ({ versionId, name }) => renameVersion(versionId, name)
                : undefined
            }
            onDeleteVersion={
              versioning.onDeleteVersion
                ? (versionId) => deleteVersion(versionId)
                : undefined
            }
          />
        ) : null}
        <ExecutionResultOverlay
          onAbortScript={Boolean(onAbortScript) ? abortScript : undefined}
          canAbortScript={canAbortScript}
        />
      </EditorProvider>
    </DndProvider>
  );
};

export default WorkflowEditor;
export type { WorkflowEditorProps };
