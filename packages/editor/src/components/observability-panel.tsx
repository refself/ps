import { useMemo, useState } from "react";

import type {
  ObservabilityRecording,
  ObservabilityToolRequest,
  RecordingStatus,
  ToolRequestStatus,
} from "../hooks/use-observability";

const recordingTone: Record<RecordingStatus, string> = {
  recording: "border-sky-200 bg-sky-50 text-sky-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
};

const toolTone: Record<ToolRequestStatus, string> = {
  pending: "border-sky-200 bg-sky-50 text-sky-600",
  success: "border-emerald-200 bg-emerald-50 text-emerald-600",
  error: "border-rose-200 bg-rose-50 text-rose-600",
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
  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${recordingTone[status]}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${
      status === "recording" ? "bg-sky-500 animate-pulse" :
      status === "completed" ? "bg-emerald-500" : "bg-rose-500"
    }`} />
    {status === "recording" ? "Recording" : status === "completed" ? "Completed" : "Error"}
  </span>
);

const ToolStatusBadge = ({ status }: { status: ToolRequestStatus }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toolTone[status]}`}>
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

const CopyButton = ({ label, value }: { label: string; value: unknown }) => {
  const [copied, setCopied] = useState(false);

  if (value === undefined || value === null || value === "") {
    return null;
  }

  const stringValue = typeof value === "string" ? value : JSON.stringify(value);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(stringValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.error("Failed to copy", error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-700"
      title={`Copy ${label}`}
    >
      <span className="uppercase tracking-wide text-[10px] text-slate-400">{label}</span>
      <span className="max-w-[140px] truncate font-mono text-[10px] text-slate-600">{stringValue}</span>
      <span className="text-[10px] text-slate-400">{copied ? "Saved" : "Copy"}</span>
    </button>
  );
};

const ActionsTable = ({ actions }: { actions: any[] }) => {
  if (!actions || actions.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-500">
        No recorded actions
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/70 shadow-sm">
      <div className="flex-1 overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-xs text-slate-600">
          <thead className="sticky top-0 bg-white/90 backdrop-blur">
            <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="sticky left-0 z-10 bg-white/90 px-3 py-2">#</th>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Element</th>
              <th className="px-3 py-2">Details</th>
              <th className="px-3 py-2">Copy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {actions.map((action, index) => {
              const element = action?.element;
              const elementRole = element?.role ?? "—";
              const elementTitle = element?.title ?? element?.identifier ?? null;
              const description = action?.visionActionDescription || action?.speechTranscript || action?.text;
              const location = action?.windowTitle || action?.appName || action?.windowUrl;

              const copyTargets = [
                { label: "Type", value: action?.type },
                { label: "Role", value: element?.role },
                { label: "Title", value: element?.title },
                { label: "Identifier", value: element?.identifier },
                { label: "Text", value: action?.text },
                { label: "Keys", value: action?.keys },
                { label: "URL", value: action?.windowUrl },
                { label: "Screenshot", value: action?.screenshotUrl || action?.screenshotLocalPath },
              ].filter(entry => entry.value !== undefined && entry.value !== null && entry.value !== "");

              return (
                <tr key={action?.id ?? index} className="align-top">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 font-mono text-[11px] text-slate-500">{index + 1}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-500">{formatTimestamp(action?.timestamp)}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                      {action?.type ?? "unknown"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-slate-900">{elementRole}</span>
                      {elementTitle ? (
                        <span className="truncate text-[11px] text-slate-500">{elementTitle}</span>
                      ) : null}
                      {element?.frame ? (
                        <span className="font-mono text-[10px] text-slate-400">
                          ({element.frame.x}, {element.frame.y}) · {element.frame.width}×{element.frame.height}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      {location ? <span className="text-[11px] text-slate-500">{location}</span> : null}
                      {description ? <span className="text-sm text-slate-800">{description}</span> : null}
                      <details>
                        <summary className="cursor-pointer text-[11px] text-sky-600 hover:text-sky-700">Raw</summary>
                        <pre className="mt-1 max-h-40 overflow-auto rounded border border-slate-200 bg-white p-2 text-[11px] text-slate-500 whitespace-pre-wrap">
                          {JSON.stringify(action, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {copyTargets.length > 0 ? (
                        copyTargets.map(target => (
                          <CopyButton key={target.label} label={target.label} value={target.value} />
                        ))
                      ) : (
                        <CopyButton label="JSON" value={action} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SpeechSegmentRow = ({ segment }: { segment: any }) => (
  <li className="rounded-lg border border-slate-200 bg-white/80 p-3 shadow-sm">
    <p className="mb-1 text-sm font-medium text-slate-900">{segment?.text ?? "(no transcript)"}</p>
    <div className="flex items-center gap-3 text-[11px] text-slate-500">
      <span>{segment?.timestamp ?? "—"}</span>
      {typeof segment?.confidence === "number" ? (
        <span>{(segment.confidence * 100).toFixed(0)}% confidence</span>
      ) : null}
    </div>
  </li>
);

const RecordingDetail = ({ recording }: { recording: ObservabilityRecording }) => {
  const parsed = useMemo(() => parseRecordingData(recording), [recording]);
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="flex h-full flex-1 flex-col gap-4 overflow-hidden min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Recording</span>
            <span className="font-mono text-sm text-slate-800">{shortId(recording.recordingId)}</span>
          </div>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Started</span>
            <span>{formatTimestamp(recording.createdAt)}</span>
          </div>
          {recording.stoppedAt ? (
            <>
              <div className="h-5 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-400">Stopped</span>
                <span>{formatTimestamp(recording.stoppedAt)}</span>
              </div>
            </>
          ) : null}
        </div>
        <StatusBadge status={recording.status} />
      </div>

      {recording.lastError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-700">
          <strong className="font-semibold">Error:</strong> {recording.lastError}
        </div>
      ) : null}

      {parsed?.kind === "session" ? (
        <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
          <div className="flex w-64 flex-shrink-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white/60 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Session</h3>
              <span className="font-mono text-xs text-slate-500">{shortId(parsed.sessionId)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
              <div className="rounded-lg border border-slate-100 bg-white/70 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Actions</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{parsed.actions.length}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-white/70 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Speech</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{parsed.speechSegments.length}</p>
              </div>
              <div className="col-span-2 rounded-lg border border-slate-100 bg-white/70 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Duration</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {parsed.startTime && parsed.endTime ?
                    `${Math.round((new Date(parsed.endTime).getTime() - new Date(parsed.startTime).getTime()) / 1000)}s` :
                    parsed.startTime ? 'In progress' : '—'}
                </p>
              </div>
            </div>
            {parsed.options ? (
              <div className="rounded-lg border border-slate-100 bg-white/70 p-3 text-[11px] text-slate-600">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Recording Options</p>
                <dl className="space-y-1">
                  {Object.entries(parsed.options).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <dt className="uppercase tracking-wide text-[10px] text-slate-400">{key}</dt>
                      <dd className="font-medium text-slate-700">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setShowRaw(prev => !prev)}
              className="text-[11px] font-medium text-slate-500 underline-offset-4 transition hover:text-slate-700 hover:underline"
            >
              {showRaw ? "Hide raw payload" : "Show raw payload"}
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            {parsed.speechSegments.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Speech</h3>
                  <span className="text-xs text-slate-500">{parsed.speechSegments.length}</span>
                </div>
                <ul className="space-y-2">
                  {parsed.speechSegments.map((segment, index) => (
                    <SpeechSegmentRow key={segment?.id ?? index} segment={segment} />
                  ))}
                </ul>
              </div>
            )}
          <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white min-h-0">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <h3 className="text-base font-semibold text-gray-900">Actions</h3>
              <span className="text-sm text-gray-500">{parsed.actions.length}</span>
            </div>
            <ActionsTable actions={parsed.actions} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Actions</h3>
            <span className="text-xs text-gray-500">{parsed?.kind === "actions" ? parsed.actions.length : 0}</span>
          </div>
          <ActionsTable actions={parsed?.actions ?? []} />
        </div>
      )}

      {showRaw && parsed ? (
        <div className="max-h-[260px] overflow-auto rounded-2xl border border-slate-200 bg-white p-4 text-[11px] text-slate-700 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Raw Payload</p>
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
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
      <div className="flex items-center gap-4 text-sm text-slate-700">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1">
          <span className={`h-2 w-2 rounded-full ${connection?.hasOSClient ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <span className="font-medium">Desktop App</span>
          <span className="text-xs uppercase tracking-wide text-slate-400">
            {connection?.hasOSClient ? 'Connected' : 'Required'}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1">
          <span className={`h-2 w-2 rounded-full ${connection?.hasWebClient ? 'bg-sky-500' : 'bg-slate-300'}`} />
          <span className="font-medium">Browser</span>
          <span className="text-xs uppercase tracking-wide text-slate-400">
            {connection?.hasWebClient ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>
      {(onStartRecording || onStopRecording) && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onStartRecording?.()}
            disabled={!canStart || recordingBusy}
            className="rounded-full border border-sky-300 bg-sky-50 px-4 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {recordingBusy && !activeRecording ? 'Starting…' : 'Start Recording'}
          </button>
          <button
            type="button"
            onClick={() => selectedRecording && onStopRecording?.(selectedRecording.recordingId)}
            disabled={!canStop || recordingBusy}
            className="rounded-full border border-rose-300 bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {recordingBusy && activeRecording ? 'Stopping…' : 'Stop Recording'}
          </button>
        </div>
      )}
    </div>
  );

  const recordingsPane = (
    <div className="flex h-full flex-1 overflow-hidden">
      {displayRecordings.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex max-w-sm flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white/70 p-8 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h4 className="text-base font-semibold text-slate-900">No recordings yet</h4>
              <p className="text-sm text-slate-500">Start a recording to capture workflow execution details.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid h-full w-full grid-cols-[260px_1fr] gap-5 overflow-hidden">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-slate-900">Recordings</h3>
              <span className="text-xs text-slate-500">{displayRecordings.length}</span>
            </div>
            <div className="-mx-2 flex-1 overflow-auto px-2">
              <ul className="space-y-2">
                {displayRecordings.map(recording => {
                  const isSelected = selectedRecording?.recordingId === recording.recordingId;
                  return (
                    <li key={recording.recordingId}>
                      <button
                        type="button"
                        onClick={() => setSelectedRecordingId(recording.recordingId)}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition shadow-sm ${
                          isSelected
                            ? 'border-sky-300 bg-sky-50/70 text-slate-900'
                            : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span className="font-semibold">{shortId(recording.recordingId)}</span>
                          <StatusBadge status={recording.status} />
                        </div>
                        <div className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                          <p>Started {formatTimestamp(recording.createdAt)}</p>
                          {recording.stoppedAt ? (
                            <p>Stopped {formatTimestamp(recording.stoppedAt)}</p>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <div className="flex flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-inner">
            {selectedRecording ? (
              <RecordingDetail recording={selectedRecording} />
            ) : (
              <div className="flex w-full items-center justify-center text-xs text-slate-500">
                Select a recording to view details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const requestsSection = (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Tool Requests</h3>
      {error && (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {toolRequests.length === 0 ? (
        <p className="text-sm text-slate-500">No tool activity</p>
      ) : (
        <div className="space-y-3">
          {toolRequests.map((request) => (
            <div
              key={request.requestId}
              className="rounded-xl border border-slate-200 bg-white/70 p-3"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-900">{request.tool}</p>
                  <p className="font-mono text-[11px] text-slate-500">{shortId(request.requestId)}</p>
                </div>
                <ToolStatusBadge status={request.status} />
              </div>
              <div className="space-y-1 text-[11px] text-slate-500">
                <p>Created {formatTimestamp(request.createdAt)}</p>
                {request.resolvedAt && (
                  <p>Resolved {formatTimestamp(request.resolvedAt)}</p>
                )}
                {request.error && (
                  <p className="mt-2 text-rose-600">{request.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const content = (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="shrink-0">{connectionsSection}</div>
      <div className="flex-1 overflow-hidden min-h-0">
        {recordingsPane}
      </div>
      {toolRequests.length > 0 ? (
        <div className="max-h-56 overflow-auto">
          {requestsSection}
        </div>
      ) : null}
    </div>
  );

  if (variant === "aside") {
    return (
      <aside className="hidden h-full w-96 shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white/80 p-4 backdrop-blur lg:flex">
        <div className="flex h-full flex-col overflow-y-auto pr-2">
          {content}
        </div>
      </aside>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/60 p-6">
      <div className="flex h-full flex-col overflow-y-auto pr-2">
        {content}
      </div>
    </div>
  );
};
