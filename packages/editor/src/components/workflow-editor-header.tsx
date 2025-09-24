import { useMemo } from 'react';
import { Icon } from './icon';
import { useEditorStore } from '../state/editor-store';
import { usePaletteStore } from '../state/palette-store';
import type { ConnectionStatus, EditorMode, WorkflowVersioningConfig } from '../types/workflow-editor';

type WorkflowEditorHeaderProps = {
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  onBack?: () => void;
  connectionStatus: ConnectionStatus;
  enableCommandPalette?: boolean;
  enableUndoRedo?: boolean;
  versioning?: WorkflowVersioningConfig;
  setIsVersionHistoryOpen: (open: boolean) => void;
  onRunScript?: () => void;
  canRunScript: boolean;
  isRunnable: boolean;
  executionState: string;
  documentName: string;
  onRename: (value: string) => void;
  selectedBlockId: string | null;
  onDuplicateBlock: (blockId: string) => void;
  observabilityConfig?: { workflowId: string; baseUrl: string } | undefined;
};

const WorkflowEditorHeader = ({
  mode,
  setMode,
  onBack,
  connectionStatus,
  enableCommandPalette = false,
  enableUndoRedo = false,
  versioning,
  setIsVersionHistoryOpen,
  onRunScript,
  canRunScript,
  isRunnable,
  executionState,
  documentName,
  onRename,
  selectedBlockId,
  onDuplicateBlock,
  observabilityConfig,
}: WorkflowEditorHeaderProps) => {
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const openPalette = usePaletteStore((state) => state.openPalette);

  const statusMeta = useMemo(() => {
    if (connectionStatus === "offline") {
      return { label: "Offline", color: "#CD3A50", tone: "border-[#CD3A50] bg-[#CD3A5010] text-[#CD3A50]" };
    }
    if (connectionStatus === "checking") {
      return { label: "Checking…", color: "#9AA7B4", tone: "border-[#9AA7B4] bg-white text-[#9AA7B4]" };
    }
    return { label: "Connected", color: "#32AA81", tone: "border-[#32AA81] bg-[#32AA8110] text-[#32AA81]" };
  }, [connectionStatus]);

  return (
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
          onChange={(event) => onRename(event.target.value)}
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
        <button
          type="button"
          onClick={() => setMode("recordings")}
          disabled={!observabilityConfig}
          className={`rounded-full px-4 py-1 transition ${
            mode === "recordings" ? "bg-white text-[#3A5AE5] shadow" : "text-[#657782]"
          } ${observabilityConfig ? "" : "opacity-50"}`}
          aria-pressed={mode === "recordings"}
        >
          Recordings
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
            onDuplicateBlock(selectedBlockId);
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
            onClick={onRunScript}
            disabled={executionState === "running" || !isRunnable}
            className="flex h-9 items-center gap-2 rounded-full border border-[#3A5AE5] bg-[#3A5AE5] px-4 py-1 text-sm font-semibold text-white transition hover:bg-[#2d4bd4] disabled:cursor-not-allowed disabled:border-[#9AA7B4] disabled:bg-[#9AA7B4]"
          >
            <Icon name="play" className="h-4 w-4" />
            {executionState === "running"
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
};

export default WorkflowEditorHeader;
