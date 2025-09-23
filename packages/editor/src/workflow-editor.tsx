import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { generateCode, type WorkflowDocument } from "@workflow-builder/core";

import "./styles.css";

import BlockLibraryPanel from "./components/block-library-panel";
import CommandPalette from "./components/command-palette";
import EditorCanvas from "./components/editor-canvas";
import ExecutionResultOverlay from "./components/execution-result-overlay";
import InspectorPanel from "./components/inspector-panel";
import CodeEditorPanel from "./components/code-editor-panel";
import { Icon } from "./components/icon";
import VersionHistoryDrawer, {
  type VersionDescriptor as WorkflowVersionDescriptor
} from "./components/version-history-drawer";
import { ObservabilityPanel } from "./components/observability-panel";
import { EditorProvider } from "./state/editor-provider";
import { useEditorStore } from "./state/editor-store";
import { usePaletteStore } from "./state/palette-store";
import {
  clearEditorExternalListeners,
  setEditorExternalListeners
} from "./state/external-listeners";
import {
  type ObservabilityConfig,
  useObservability,
} from "./hooks/use-observability";

type ConnectionStatus = "online" | "offline" | "checking";

type RunScriptResult = {
  ok: boolean;
  message?: string | null;
  output?: string | null;
  error?: string | null;
  durationMs?: number | null;
  logs?: string[] | null;
  raw?: unknown;
};

type RunScriptHandler = (code: string) => Promise<RunScriptResult | void> | RunScriptResult | void;

type SaveVersionPayload = {
  name?: string;
  document: WorkflowDocument;
  code: string;
};

type WorkflowVersioningConfig = {
  versions: WorkflowVersionDescriptor[];
  activeVersionId?: string | null;
  onSaveVersion: (payload: SaveVersionPayload) => void;
  onRestoreVersion: (versionId: string) => void;
  onRenameVersion?: (payload: { versionId: string; name: string }) => void;
  onDeleteVersion?: (versionId: string) => void;
};

const safeGenerateCode = (document: WorkflowDocument) => {
  try {
    return generateCode(document);
  } catch {
    return "";
  }
};

type WorkflowEditorProps = {
  document: WorkflowDocument;
  code?: string;
  onDocumentChange?: (document: WorkflowDocument) => void;
  onCodeChange?: (code: string) => void;
  onRunScript?: RunScriptHandler;
  onBack?: () => void;
  connectionStatus?: ConnectionStatus;
  enableCommandPalette?: boolean;
  enableUndoRedo?: boolean;
  versioning?: WorkflowVersioningConfig;
  initialView?: "visual" | "code";
  className?: string;
  observability?: ObservabilityConfig;
};

const WorkflowEditor = ({
  document,
  code,
  onDocumentChange,
  onCodeChange,
  onRunScript,
  onBack,
  connectionStatus = "online",
  enableCommandPalette = false,
  enableUndoRedo = false,
  versioning,
  initialView = "visual",
  className,
  observability,
}: WorkflowEditorProps) => {
  const [mode, setMode] = useState<"visual" | "code">(initialView);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const documentName = useEditorStore((state) => state.document.metadata.name);
  const renameDocument = useEditorStore((state) => state.renameDocument);
  const internalDocument = useEditorStore((state) => state.document);
  const loadWorkflowDocument = useEditorStore((state) => state.loadWorkflowDocument);
  const editorCode = useEditorStore((state) => state.code);
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
  const duplicateBlock = useEditorStore((state) => state.duplicateBlock);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const executionStatus = useEditorStore((state) => state.executionStatus);
  const setExecutionStatus = useEditorStore((state) => state.setExecutionStatus);
  const openPalette = usePaletteStore((state) => state.openPalette);

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

  const lastLoadedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state) => {
      lastLoadedSignatureRef.current = JSON.stringify(state.document);
    });
    return unsubscribe;
  }, []);

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

  useEffect(() => {
    if (!document) {
      return;
    }
    const signature = JSON.stringify(document);
    if (lastLoadedSignatureRef.current === signature) {
      return;
    }
    lastLoadedSignatureRef.current = signature;
    loadWorkflowDocument({ document, code: code ?? safeGenerateCode(document) });
  }, [document, code, loadWorkflowDocument]);

  useEffect(() => {
    lastLoadedSignatureRef.current = JSON.stringify(internalDocument);
  }, [internalDocument]);

  const handleRename = useCallback((value: string) => {
    const trimmed = value.trim();
    renameDocument(trimmed.length > 0 ? trimmed : "Untitled Workflow");
  }, [renameDocument]);

  const statusMeta = useMemo(() => {
    if (connectionStatus === "offline") {
      return { label: "Offline", color: "#CD3A50", tone: "border-[#CD3A50] bg-[#CD3A5010] text-[#CD3A50]" };
    }
    if (connectionStatus === "checking") {
      return { label: "Checking…", color: "#9AA7B4", tone: "border-[#9AA7B4] bg-white text-[#9AA7B4]" };
    }
    return { label: "Connected", color: "#32AA81", tone: "border-[#32AA81] bg-[#32AA8110] text-[#32AA81]" };
  }, [connectionStatus]);

  const canRunScript = Boolean(onRunScript);
  const isRunnable = canRunScript && connectionStatus === "online";

  const handleRunScript = useCallback(async () => {
    if (!onRunScript) {
      return;
    }

    setExecutionStatus({
      state: "running",
      message: "Executing workflow…",
      output: null,
      timestamp: Date.now()
    });

    try {
      const result = await onRunScript(editorCode);
      if (!result || typeof result !== "object" || !("ok" in result)) {
        setExecutionStatus({
          state: "success",
          message: "Workflow executed successfully.",
          output: null,
          timestamp: Date.now()
        });
        return;
      }

      const runResult = result as RunScriptResult;
      if (runResult.ok) {
        const successMessage =
          runResult.message ??
          (typeof runResult.durationMs === "number" ? `Completed in ${Math.round(runResult.durationMs)}ms` : "Workflow executed successfully.");

        setExecutionStatus({
          state: "success",
          message: successMessage,
          output: runResult.output ?? null,
          timestamp: Date.now()
        });
        return;
      }

      const errorMessage = runResult.error ?? runResult.message ?? "Workflow execution failed.";
      setExecutionStatus({
        state: "error",
        message: errorMessage,
        output: runResult.output ?? null,
        timestamp: Date.now()
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to execute workflow.";
      setExecutionStatus({
        state: "error",
        message,
        output: null,
        timestamp: Date.now()
      });
    }
  }, [editorCode, onRunScript, setExecutionStatus]);

  const handleCreateVersion = useCallback(
    (name?: string) => {
      if (!versioning) {
        return;
      }
      versioning.onSaveVersion({
        name,
        document: internalDocument,
        code: editorCode
      });
    },
    [editorCode, internalDocument, versioning]
  );

  const handleRestoreVersion = useCallback(
    (versionId: string) => {
      versioning?.onRestoreVersion(versionId);
    },
    [versioning]
  );

  const handleRenameVersion = useCallback(
    (versionId: string, name: string) => {
      versioning?.onRenameVersion?.({ versionId, name });
    },
    [versioning]
  );

  const handleDeleteVersion = useCallback(
    (versionId: string) => {
      versioning?.onDeleteVersion?.(versionId);
    },
    [versioning]
  );

  const header = (
    <div className="flex items-center justify-between border-b border-[#0A1A2314] bg-white/90 px-6 py-4">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#CED6E9] bg-white text-[#0A1A23] shadow-sm transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]"
            aria-label="Back"
          >
            <Icon name="back" className="h-4 w-4" />
          </button>
        ) : null}
        <input
          value={documentName}
          onChange={(event) => handleRename(event.target.value)}
          className="w-64 rounded-md border border-[#0A1A2333] bg-white px-3 py-1.5 text-sm text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
          placeholder="Untitled Workflow"
        />
      </div>
      <div className="flex items-center gap-2 rounded-full border border-[#0A1A2333] bg-[#F5F6FB] p-1 text-sm font-medium text-[#0A1A23]">
        <button
          type="button"
          onClick={() => setMode("visual")}
          className={`rounded-full px-4 py-1 transition ${
            mode === "visual" ? "bg-white text-[#3A5AE5] shadow" : "text-[#657782]"
          }`}
          aria-pressed={mode === "visual"}
        >
          Visual
        </button>
        <button
          type="button"
          onClick={() => setMode("code")}
          className={`rounded-full px-4 py-1 transition ${
            mode === "code" ? "bg-white text-[#3A5AE5] shadow" : "text-[#657782]"
          }`}
          aria-pressed={mode === "code"}
        >
          Code
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.tone}`}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusMeta.color }} />
          {statusMeta.label}
        </span>
        {versioning ? (
          <button
            type="button"
            onClick={() => setIsVersionHistoryOpen(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#CED6E9] bg-white text-[#0A1A23] shadow-sm transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]"
            aria-label="Open version history"
          >
            <Icon name="clock" className="h-4 w-4" />
            {versioning.activeVersionId ? null : (
              <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2 items-center justify-center rounded-full bg-[#CD3A50]" aria-hidden="true" />
            )}
          </button>
        ) : null}
        {enableCommandPalette ? (
          <button
            type="button"
            onClick={() => openPalette()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#CED6E9] bg-white text-[#0A1A23] shadow-sm transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]"
            aria-label="Open command palette"
          >
            <Icon name="keyboard" className="h-4 w-4" />
          </button>
        ) : null}
        {enableUndoRedo ? (
          <>
            <button
              type="button"
              onClick={undo}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#CED6E9] bg-white text-[#0A1A23] shadow-sm transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]"
              aria-label="Undo"
            >
              <Icon name="undo" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#CED6E9] bg-white text-[#0A1A23] shadow-sm transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]"
              aria-label="Redo"
            >
              <Icon name="redo" className="h-4 w-4" />
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (!selectedBlockId) {
              return;
            }
            duplicateBlock(selectedBlockId);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#CED6E9] bg-white text-[#0A1A23] shadow-sm transition hover:border-[#3A5AE5] hover:text-[#3A5AE5] disabled:cursor-not-allowed disabled:text-[#9AA7B4]"
          disabled={!selectedBlockId}
          aria-label="Duplicate block"
        >
          <Icon name="copy" className="h-4 w-4" />
        </button>
        {canRunScript ? (
          <button
            type="button"
            onClick={handleRunScript}
            disabled={executionStatus.state === "running" || !isRunnable}
            className="flex h-9 items-center gap-2 rounded-full border border-[#3A5AE5] bg-[#3A5AE5] px-4 py-1 text-sm font-semibold text-white transition hover:bg-[#2d4bd4] disabled:cursor-not-allowed disabled:border-[#9AA7B4] disabled:bg-[#9AA7B4]"
          >
            <Icon name="play" className="h-4 w-4" />
            {executionStatus.state === "running"
              ? "Running"
              : isRunnable
                ? "Run"
                : connectionStatus === "checking"
                  ? "Checking"
                  : "Connect OS Client"}
          </button>
        ) : null}
      </div>
    </div>
  );

  const renderEditorBody = (extraClassName?: string) => (
    <div
      className={`workflow-editor-root flex h-full w-full flex-col overflow-hidden bg-[#F5F6F9] text-[#0A1A23] ${extraClassName ?? ""}`}
    >
      {header}
      {mode === "code" ? (
        <div className="workflow-editor-scrollable flex flex-1 overflow-hidden px-10 py-8">
          <div className="workflow-editor-scrollable flex w-full flex-col overflow-hidden rounded-2xl border border-[#0A1A2314] bg-white shadow-[0_30px_60px_rgba(10,26,35,0.15)]">
            <CodeEditorPanel variant="full" />
          </div>
        </div>
      ) : (
        <div className="workflow-editor-scrollable flex flex-1 overflow-hidden">
          <BlockLibraryPanel />
          <EditorCanvas />
          <div className="flex w-[420px] flex-col overflow-hidden border-l border-[#0A1A2314] bg-white/80 backdrop-blur">
            <InspectorPanel />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <EditorProvider>
        {observabilityConfig ? (
          <div className={`flex h-full w-full ${className ?? ""}`}>
            {renderEditorBody("flex-1")}
            <ObservabilityPanel
              recordings={observabilityState.recordings}
              toolRequests={observabilityState.toolRequests}
              status={observabilityState.status}
              error={observabilityState.error}
              connection={observabilityState.connection}
            />
          </div>
        ) : (
          renderEditorBody(className)
        )}
        {enableCommandPalette ? <CommandPalette /> : null}
        {versioning ? (
          <VersionHistoryDrawer
            open={isVersionHistoryOpen}
            onClose={() => setIsVersionHistoryOpen(false)}
            versions={versioning.versions}
            activeVersionId={versioning.activeVersionId}
            onSaveVersion={({ name }) => handleCreateVersion(name)}
            onRestoreVersion={(versionId) => handleRestoreVersion(versionId)}
            onRenameVersion={
              versioning.onRenameVersion
                ? ({ versionId, name }) => handleRenameVersion(versionId, name)
                : undefined
            }
            onDeleteVersion={
              versioning.onDeleteVersion
                ? (versionId) => handleDeleteVersion(versionId)
                : undefined
            }
          />
        ) : null}
        <ExecutionResultOverlay />
      </EditorProvider>
    </DndProvider>
  );
};

export default WorkflowEditor;
export type { WorkflowEditorProps };
