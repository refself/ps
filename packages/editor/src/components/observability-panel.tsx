import { useMemo, useState } from "react";

import type {
  ObservabilityRecording,
  ObservabilityToolRequest,
  RecordingStatus,
  ToolRequestStatus,
} from "../hooks/use-observability";

const recordingTone: Record<RecordingStatus, string> = {
  recording: "bg-orange-100 text-orange-800 border-orange-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  error: "bg-red-100 text-red-800 border-red-200",
};

const toolTone: Record<ToolRequestStatus, string> = {
  pending: "bg-blue-50 text-blue-600 border-blue-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  error: "bg-red-50 text-red-600 border-red-200",
};

const shortId = (value: string) => (value.length > 10 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value);

const formatTimestamp = (value: number | string | null | undefined) => {
  if (!value) {
    return "—";
  }

  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
};

const StatusBadge = ({ status }: { status: RecordingStatus }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${recordingTone[status]}`}>
    <div className={`h-1.5 w-1.5 rounded-full ${
      status === "recording" ? "bg-orange-500 animate-pulse" :
      status === "completed" ? "bg-green-500" : "bg-red-500"
    }`} />
    {status === "recording" ? "Recording" : status === "completed" ? "Completed" : "Error"}
  </span>
);

const ToolStatusBadge = ({ status }: { status: ToolRequestStatus }) => (
  <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${toolTone[status]}`}>
    {status === "pending" ? "Pending" : status === "success" ? "Success" : "Error"}
  </span>
);


type ParsedSession = {
  kind: "session";
  sessionId: string;
  startTime?: string;
  endTime?: string | null;
  actions: any[];
  speechSegments: any[];
  options?: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  raw: unknown;
};

type ParsedActionList = {
  kind: "actions";
  actions: any[];
  raw: unknown;
};

const parseRecordingData = (recording: ObservabilityRecording): ParsedSession | ParsedActionList | null => {
  const payload = recording.data;
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if ("sessionId" in payload && Array.isArray((payload as any).actions)) {
    const metadata = typeof (payload as any).metadata === "object" ? (payload as any).metadata : null;
    return {
      kind: "session",
      sessionId: String((payload as any).sessionId ?? recording.recordingId),
      startTime: (payload as any).startTime ? String((payload as any).startTime) : undefined,
      endTime: (payload as any).endTime ? String((payload as any).endTime) : null,
      actions: Array.isArray((payload as any).actions) ? (payload as any).actions : [],
      speechSegments: Array.isArray((payload as any).speechSegments) ? (payload as any).speechSegments : [],
      options: typeof (payload as any).recordingOptions === "object" ? (payload as any).recordingOptions : undefined,
      metadata,
      raw: payload,
    };
  }

  if (Array.isArray((payload as any).content)) {
    return {
      kind: "actions",
      actions: (payload as any).content,
      raw: payload,
    };
  }

  if (Array.isArray(payload)) {
    return {
      kind: "actions",
      actions: payload,
      raw: payload,
    };
  }

  return {
    kind: "actions",
    actions: [],
    raw: payload,
  };
};

const ActionRow = ({ action, index }: { action: any; index: number }) => {
  const label = action?.type ? String(action.type) : `Action ${index + 1}`;
  const timestamp = action?.timestamp ? formatTimestamp(action.timestamp) : "—";
  const description = action?.visionActionDescription || action?.speechTranscript || action?.text;
  const location = action?.appName || action?.windowTitle;

  return (
    <li className="group border-b border-gray-100 p-4 hover:bg-gray-50/50">
      <div className="flex items-start gap-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
            <span className="text-xs text-gray-500 ml-2">{timestamp}</span>
          </div>
          {location && <p className="text-xs text-gray-500 mb-1">{location}</p>}
          {description && <p className="text-sm text-gray-700 mb-2">{description}</p>}
          <details className="group/details">
            <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 select-none">View raw data</summary>
            <pre className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap max-h-32">
              {JSON.stringify(action, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </li>
  );
};

const SpeechSegmentRow = ({ segment }: { segment: any }) => (
  <li className="border-l-4 border-purple-200 bg-purple-50/50 p-3 rounded-r-lg">
    <p className="font-medium text-gray-900 mb-1">{segment?.text ?? "(no transcript)"}</p>
    <div className="flex items-center gap-4 text-xs text-gray-500">
      <span>{segment?.timestamp ?? "—"}</span>
      {typeof segment?.confidence === "number" && (
        <span>{(segment.confidence * 100).toFixed(0)}% confidence</span>
      )}
    </div>
  </li>
);

const RecordingDetail = ({ recording }: { recording: ObservabilityRecording }) => {
  const parsed = useMemo(() => parseRecordingData(recording), [recording]);
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="flex h-full flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-gray-500">Recording ID</p>
            <p className="font-mono text-sm text-gray-900">{shortId(recording.recordingId)}</p>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div>
            <p className="text-xs text-gray-500">Started</p>
            <p className="text-sm text-gray-900">{formatTimestamp(recording.createdAt)}</p>
          </div>
          {recording.stoppedAt && (
            <>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <p className="text-xs text-gray-500">Stopped</p>
                <p className="text-sm text-gray-900">{formatTimestamp(recording.stoppedAt)}</p>
              </div>
            </>
          )}
        </div>
        <StatusBadge status={recording.status} />
      </div>

      {recording.lastError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-600">
          <strong className="font-semibold">Error:</strong> {recording.lastError}
        </div>
      ) : null}

      {parsed?.kind === "session" ? (
        <div className="flex flex-1 gap-6 overflow-hidden">
          <div className="flex w-72 flex-shrink-0 flex-col gap-4 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-base font-semibold text-gray-900">Session Summary</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Session ID</p>
                <p className="mt-1 font-mono text-sm text-gray-900">{shortId(parsed.sessionId)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{parsed.actions.length}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Speech</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{parsed.speechSegments.length}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</p>
                <p className="mt-1 text-sm text-gray-900">
                  {parsed.startTime && parsed.endTime ?
                    `${Math.round((new Date(parsed.endTime).getTime() - new Date(parsed.startTime).getTime()) / 1000)}s` :
                    parsed.startTime ? 'In progress' : '—'
                  }
                </p>
              </div>
            </div>
            {parsed.options ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                <p className="text-[11px] uppercase tracking-wide text-[#657782]">Recording Options</p>
                <ul className="mt-1 space-y-1 text-[11px] text-gray-600">
                  {Object.entries(parsed.options).map(([key, value]) => (
                    <li key={key}>{key}: {String(value)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setShowRaw((prev) => !prev)}
              className="rounded border border-[#3A5AE5] bg-[#EEF2FF] px-3 py-1 text-[11px] font-semibold text-[#3A5AE5] transition hover:bg-[#e1e7ff]"
            >
              {showRaw ? "Hide Raw Payload" : "Show Raw Payload"}
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            {parsed.speechSegments.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Speech Transcript</h3>
                  <span className="text-sm text-gray-500">{parsed.speechSegments.length}</span>
                </div>
                <ul className="space-y-2">
                  {parsed.speechSegments.map((segment, index) => (
                    <SpeechSegmentRow key={segment?.id ?? index} segment={segment} />
                  ))}
                </ul>
              </div>
            )}
            <div className="flex-1 overflow-hidden bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">Actions</h3>
                <span className="text-sm text-gray-500">{parsed.actions.length}</span>
              </div>
              {parsed.actions.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-gray-500">No recorded actions</p>
                </div>
              ) : (
                <ul className="overflow-auto max-h-[calc(100%-4rem)]">
                  {parsed.actions.map((action, index) => (
                    <ActionRow key={action?.id ?? index} action={action} index={index} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Actions</h3>
            <span className="text-xs text-gray-500">{parsed?.kind === "actions" ? parsed.actions.length : 0}</span>
          </div>
          {parsed && parsed.actions.length > 0 ? (
            <ul className="mt-3 space-y-2 overflow-auto pr-2">
              {parsed.actions.map((action, index) => (
                <ActionRow key={action?.id ?? index} action={action} index={index} />
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-gray-500">No recorded actions.</p>
          )}
        </div>
      )}

      {showRaw && parsed ? (
        <div className="max-h-[280px] overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-[11px] text-gray-700">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#657782]">Raw Payload</p>
          <pre className="mt-2 whitespace-pre-wrap">
            {JSON.stringify(parsed.raw ?? recording.data, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
};

export const ObservabilityPanel = ({
  recordings,
  toolRequests,
  status,
  error,
  connection,
  onStartRecording,
  onStopRecording,
  recordingBusy = false,
  activeRecordingId,
  variant = 'aside',
}: {
  recordings: ObservabilityRecording[];
  toolRequests: ObservabilityToolRequest[];
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
  connection?: {
    hasOSClient: boolean;
    hasWebClient: boolean;
  };
  onStartRecording?: () => void;
  onStopRecording?: (recordingId: string) => void;
  recordingBusy?: boolean;
  activeRecordingId?: string | null;
  variant?: 'aside' | 'full';
}) => {
  const activeRecording =
    recordings.find((recording) => recording.status === "recording") ||
    (activeRecordingId
      ? {
          recordingId: activeRecordingId,
          status: "recording" as RecordingStatus,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stoppedAt: null,
          lastError: null,
          data: undefined,
        }
      : undefined);

  const displayRecordings = activeRecording && !recordings.some((recording) => recording.recordingId === activeRecording.recordingId)
    ? [activeRecording, ...recordings]
    : recordings;

  const canStart = Boolean(onStartRecording) && !recordingBusy;
  const canStop = Boolean(onStopRecording) && Boolean(activeRecording) && !recordingBusy;

  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(activeRecording?.recordingId ?? null);

  const selectedRecording = useMemo(() => {
    if (selectedRecordingId) {
      return displayRecordings.find((recording) => recording.recordingId === selectedRecordingId) ?? null;
    }
    return displayRecordings[0] ?? null;
  }, [selectedRecordingId, displayRecordings]);

  const connectionsSection = (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${connection?.hasOSClient ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-sm text-gray-700">Desktop App</span>
          {connection?.hasOSClient ? (
            <span className="text-xs text-green-600 font-medium">Connected</span>
          ) : (
            <span className="text-xs text-gray-500">Required for recording</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${connection?.hasWebClient ? 'bg-blue-500' : 'bg-gray-300'}`} />
          <span className="text-sm text-gray-700">Browser</span>
        </div>
      </div>
      {(onStartRecording || onStopRecording) && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onStartRecording?.()}
            disabled={!canStart || recordingBusy}
            className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {recordingBusy && !activeRecording ? 'Starting…' : 'Start Recording'}
          </button>
          <button
            type="button"
            onClick={() => selectedRecording && onStopRecording?.(selectedRecording.recordingId)}
            disabled={!canStop || recordingBusy}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {recordingBusy && activeRecording ? 'Stopping…' : 'Stop Recording'}
          </button>
        </div>
      )}
    </div>
  );

  const recordingsPane = (
    <div className="flex h-full flex-1 overflow-hidden bg-white">
      {displayRecordings.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex max-w-sm flex-col items-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-medium text-gray-900">No recordings yet</h4>
              <p className="text-sm text-gray-500">Start a recording to capture workflow execution details.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full gap-6 overflow-hidden">
          <div className="flex w-80 flex-shrink-0 flex-col overflow-hidden">
            <div className="flex items-center justify-between px-1 pb-4">
              <h3 className="text-base font-semibold text-gray-900">Recordings</h3>
              <span className="text-sm text-gray-500">{displayRecordings.length}</span>
            </div>
            <div className="flex-1 overflow-auto">
              <ul className="space-y-1">
                {displayRecordings.map((recording) => {
                  const isSelected = selectedRecording?.recordingId === recording.recordingId;
                  return (
                    <li key={recording.recordingId}>
                      <button
                        type="button"
                        onClick={() => setSelectedRecordingId(recording.recordingId)}
                        className={`flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition ${
                          isSelected ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{shortId(recording.recordingId)}</span>
                          <StatusBadge status={recording.status} />
                        </div>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <p>Started {formatTimestamp(recording.createdAt)}</p>
                          {recording.stoppedAt && (
                            <p>Stopped {formatTimestamp(recording.stoppedAt)}</p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <div className="flex flex-1 overflow-hidden">
            {selectedRecording ? (
              <RecordingDetail recording={selectedRecording} />
            ) : (
              <div className="flex w-full items-center justify-center rounded-xl border border-dashed border-[#0A1A2314] bg-[#F5F6F9] text-xs text-[#657782]">
                Select a recording to view details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const requestsSection = (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-base font-semibold text-gray-900 mb-3">Tool Requests</h3>
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {toolRequests.length === 0 ? (
        <p className="text-sm text-gray-500">No tool activity</p>
      ) : (
        <div className="space-y-3">
          {toolRequests.map((request) => (
            <div key={request.requestId} className="border-l-4 border-blue-200 bg-blue-50/50 p-3 rounded-r-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-900">{request.tool}</p>
                  <p className="text-xs text-gray-500">{shortId(request.requestId)}</p>
                </div>
                <ToolStatusBadge status={request.status} />
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Created: {formatTimestamp(request.createdAt)}</p>
                {request.resolvedAt && (
                  <p>Resolved: {formatTimestamp(request.resolvedAt)}</p>
                )}
                {request.error && (
                  <p className="text-red-600 mt-2">{request.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const content = (
    <div className="flex h-full flex-col gap-4">
      {connectionsSection}
      <div className="flex-1 overflow-hidden">
        {recordingsPane}
      </div>
      {toolRequests.length > 0 && requestsSection}
    </div>
  );

  if (variant === "aside") {
    return (
      <aside className="hidden h-full w-96 shrink-0 flex-col border-l border-gray-200 bg-white p-4 lg:flex">
        {content}
      </aside>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-6">
      {content}
    </div>
  );
};
