import type { WorkflowDocument } from '@workflow-builder/core';

export type ConnectionStatus = "online" | "offline" | "checking";
export type EditorMode = "visual" | "code" | "recordings";

export type RunScriptResult = {
  ok: boolean;
  message?: string | null;
  output?: string | null;
  error?: string | null;
  durationMs?: number | null;
  logs?: string[] | null;
  raw?: unknown;
};

export type RunScriptHandler = (code: string) => Promise<RunScriptResult | void> | RunScriptResult | void;
export type AbortScriptResult = RunScriptResult;
export type AbortScriptHandler = () => Promise<AbortScriptResult | void> | AbortScriptResult | void;

export type SaveVersionPayload = {
  name?: string;
  document: WorkflowDocument;
  code: string;
};

export type WorkflowVersionDescriptor = {
  id: string;
  name: string;
  createdAt: string;
  createdBy?: string;
  note?: string;
  isNamed?: boolean;
};

export type WorkflowVersioningConfig = {
  versions: WorkflowVersionDescriptor[];
  activeVersionId?: string | null;
  onSaveVersion: (payload: SaveVersionPayload) => void;
  onRestoreVersion: (versionId: string) => void;
  onRenameVersion?: (payload: { versionId: string; name: string }) => void;
  onDeleteVersion?: (versionId: string) => void;
};

export type ObservabilityConfig = {
  workflowId: string;
  baseUrl: string;
  apiKey?: string;
  pollIntervalMs?: number;
  connectionStatus?: {
    hasOSClient: boolean;
    hasWebClient: boolean;
  };
};

export type WorkflowEditorProps = {
  document: WorkflowDocument;
  code?: string;
  onDocumentChange?: (document: WorkflowDocument) => void;
  onCodeChange?: (code: string) => void;
  onRunScript?: RunScriptHandler;
  onAbortScript?: AbortScriptHandler;
  onBack?: () => void;
  connectionStatus?: ConnectionStatus;
  enableCommandPalette?: boolean;
  enableUndoRedo?: boolean;
  versioning?: WorkflowVersioningConfig;
  initialView?: EditorMode;
  className?: string;
  observability?: ObservabilityConfig;
  onStartRecording?: () => Promise<void> | void;
  onStopRecording?: (recordingId: string) => Promise<void> | void;
  activeRecordingId?: string | null;
  recordingError?: string | null;
  recordingBusy?: boolean;
  recordings?: Array<{
    recordingId: string;
    status: 'recording' | 'completed' | 'error';
    data?: unknown;
    createdAt: number;
    updatedAt: number;
    stoppedAt: number | null;
    lastError: string | null;
  }>;
};
