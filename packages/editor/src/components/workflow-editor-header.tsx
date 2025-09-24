import { useMemo } from 'react';
import { Icon } from './icon';
import { useEditorStore } from '../state/editor-store';
import { usePaletteStore } from '../state/palette-store';
import { editorTheme, statusTone } from '../theme';
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
    if (connectionStatus === 'offline') {
      return statusTone.offline;
    }
    if (connectionStatus === 'checking') {
      return statusTone.checking;
    }
    return statusTone.online;
  }, [connectionStatus]);

  const runDisabled = executionState === 'running' || executionState === 'aborting' || !isRunnable;

  return (
    <div
      className="flex items-center justify-between px-6 py-4"
      style={{
        borderBottom: `1px solid ${editorTheme.colors.borderSubtle}`,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:border-[var(--editor-color-action)] hover:text-[var(--editor-color-action)]"
            style={{
              border: `1px solid ${editorTheme.colors.borderSubtle}`,
              background: 'rgba(255, 255, 255, 0.95)',
              color: editorTheme.colors.foreground,
              boxShadow: '0 4px 12px rgba(10, 26, 35, 0.08)',
            }}
            aria-label="Back"
          >
            <Icon name="back" className="h-4 w-4" />
          </button>
        ) : null}
        <input
          value={documentName}
          onChange={(event) => onRename(event.target.value)}
          className="w-64 rounded-lg px-3 py-1.5 text-sm outline-none transition focus:border-[rgba(58,90,229,0.7)] focus:ring-2 focus:ring-[rgba(58,90,229,0.16)]"
          style={{
            border: `1px solid ${editorTheme.colors.borderSubtle}`,
            background: 'rgba(255, 255, 255, 0.95)',
            color: editorTheme.colors.foreground,
            boxShadow: '0 8px 18px rgba(10, 26, 35, 0.05)',
          }}
          placeholder="Untitled Workflow"
        />
      </div>
      <div
        className="flex items-center gap-2 rounded-full p-1 text-sm font-medium"
        style={{
          border: `1px solid ${editorTheme.colors.borderMuted}`,
          background: 'rgba(245, 246, 249, 0.9)',
          color: editorTheme.colors.foreground,
        }}
      >
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
        <span
          className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{
            border: `1px solid ${statusMeta.border}`,
            background: statusMeta.background,
            color: statusMeta.text,
          }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusMeta.dot }} />
          {statusMeta.label}
        </span>
        {versioning ? (
          <button
            type="button"
            onClick={() => setIsVersionHistoryOpen(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full transition hover:border-[var(--editor-color-action)] hover:text-[var(--editor-color-action)]"
            style={{
              border: `1px solid ${editorTheme.colors.borderSubtle}`,
              background: 'rgba(255, 255, 255, 0.95)',
              color: editorTheme.colors.foreground,
              boxShadow: '0 4px 12px rgba(10, 26, 35, 0.08)',
            }}
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
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:border-[var(--editor-color-action)] hover:text-[var(--editor-color-action)]"
            style={{
              border: `1px solid ${editorTheme.colors.borderSubtle}`,
              background: 'rgba(255, 255, 255, 0.95)',
              color: editorTheme.colors.foreground,
              boxShadow: '0 4px 12px rgba(10, 26, 35, 0.08)',
            }}
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
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:border-[var(--editor-color-action)] hover:text-[var(--editor-color-action)]"
              style={{
                border: `1px solid ${editorTheme.colors.borderSubtle}`,
                background: 'rgba(255, 255, 255, 0.95)',
                color: editorTheme.colors.foreground,
                boxShadow: '0 4px 12px rgba(10, 26, 35, 0.08)',
              }}
              aria-label="Undo"
            >
              <Icon name="undo" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:border-[var(--editor-color-action)] hover:text-[var(--editor-color-action)]"
              style={{
                border: `1px solid ${editorTheme.colors.borderSubtle}`,
                background: 'rgba(255, 255, 255, 0.95)',
                color: editorTheme.colors.foreground,
                boxShadow: '0 4px 12px rgba(10, 26, 35, 0.08)',
              }}
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
          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:border-[var(--editor-color-action)] hover:text-[var(--editor-color-action)] disabled:cursor-not-allowed"
          style={{
            border: `1px solid ${editorTheme.colors.borderSubtle}`,
            background: 'rgba(255, 255, 255, 0.95)',
            color: selectedBlockId ? editorTheme.colors.foreground : editorTheme.colors.accentMuted,
            boxShadow: '0 4px 12px rgba(10, 26, 35, 0.08)',
          }}
          disabled={!selectedBlockId}
          aria-label="Duplicate block"
        >
          <Icon name="copy" className="h-4 w-4" />
        </button>
        {canRunScript && connectionStatus === "online" ? (
          <button
            type="button"
            onClick={onRunScript}
            disabled={runDisabled}
            className="flex h-9 items-center gap-2 rounded-full px-4 py-1 text-sm font-semibold text-white transition disabled:cursor-not-allowed hover:shadow-[0_16px_32px_rgba(58,90,229,0.3)]"
            style={{
              border: `1px solid ${runDisabled ? editorTheme.colors.borderMuted : editorTheme.colors.action}`,
              background: runDisabled ? editorTheme.colors.accentMuted : editorTheme.colors.action,
              boxShadow: runDisabled ? 'none' : '0 10px 24px rgba(58, 90, 229, 0.28)',
            }}
          >
            <Icon name="play" className="h-4 w-4" />
            {executionState === "running"
              ? "Running"
              : executionState === "aborting"
                ? "Stopping…"
                : isRunnable
                ? "Run"
                : "Connect OS Client"}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default WorkflowEditorHeader;
