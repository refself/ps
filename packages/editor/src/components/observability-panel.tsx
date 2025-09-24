import { useMemo, useState } from "react";
import { Children, type ReactNode } from "react";

import type {
  ObservabilityRecording,
  ObservabilityToolRequest,
  RecordingStatus,
  ToolRequestStatus,
} from "../hooks/use-observability";

const recordingTone: Record<RecordingStatus, string> = {
  recording: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  error: "bg-red-50 text-red-600 border-red-200",
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
  <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${recordingTone[status]}`}>
    {status === "recording" ? "Recording" : status === "completed" ? "Completed" : "Error"}
  </span>
);

const ToolStatusBadge = ({ status }: { status: ToolRequestStatus }) => (
  <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${toolTone[status]}`}>
    {status === "pending" ? "Pending" : status === "success" ? "Success" : "Error"}
  </span>
);

const Section = ({
  title,
  emptyLabel,
  children,
  action,
}: {
  title: string;
  emptyLabel: string;
  children: ReactNode;
  action?: ReactNode;
}) => {
  const count = Children.count(children);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0A1A23]">{title}</h2>
        {action}
      </div>
      {count > 0 ? <div className="flex flex-col gap-3">{children}</div> : <p className="text-xs text-[#657782]">{emptyLabel}</p>}
    </section>
  );
};

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
    <li className="group rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-700 shadow-sm transition hover:border-[#3A5AE5]/50 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#3A5AE5]">
            {index + 1}
          </span>
          <span className="text-[13px] font-semibold text-gray-900">{label}</span>
        </div>
        <span className="font-mono text-[11px] text-gray-500">{timestamp}</span>
      </div>
      {location ? <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">{location}</p> : null}
      {description ? <p className="mt-2 text-[12px] text-gray-700">{description}</p> : null}
      <details className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-2 text-[11px] text-gray-600">
        <summary className="cursor-pointer select-none text-[11px] font-medium text-[#3A5AE5]">Raw Action</summary>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap">
          {JSON.stringify(action, null, 2)}
        </pre>
      </details>
    </li>
  );
};

const SpeechSegmentRow = ({ segment }: { segment: any }) => (
  <li className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-sm">
    <div className="flex items-center justify-between">
      <span className="font-semibold text-gray-900">{segment?.text ?? "(no transcript)"}</span>
      <span className="text-[11px] text-gray-400">{segment?.timestamp ?? "—"}</span>
    </div>
    <div className="mt-1 flex gap-3 text-[11px] text-gray-500">
      <span>Start: {segment?.startTime ?? "—"}</span>
      <span>End: {segment?.endTime ?? "—"}</span>
      {typeof segment?.confidence === "number" ? (
        <span>Confidence: {(segment.confidence * 100).toFixed(1)}%</span>
      ) : null}
    </div>
  </li>
);

const RecordingDetail = ({ recording }: { recording: ObservabilityRecording }) => {
  const parsed = useMemo(() => parseRecordingData(recording), [recording]);
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="flex h-full flex-1 flex-col gap-4 overflow-hidden">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[#EEF2FF] bg-[#EEF2FF]/60 p-3 text-xs text-gray-700">
          <p className="text-[11px] uppercase tracking-wide text-[#657782]">Recording ID</p>
          <p className="mt-1 font-mono text-[12px] text-gray-900">{recording.recordingId}</p>
        </div>
        <div className="rounded-xl border border-[#E6F4EE] bg-[#E6F4EE]/60 p-3 text-xs text-gray-700">
          <p className="text-[11px] uppercase tracking-wide text-[#657782]">Status</p>
          <div className="mt-1"><StatusBadge status={recording.status} /></div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-700">
          <p className="text-[11px] uppercase tracking-wide text-[#657782]">Started</p>
          <p className="mt-1 text-[12px] text-gray-900">{formatTimestamp(recording.createdAt)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-700">
          <p className="text-[11px] uppercase tracking-wide text-[#657782]">Stopped</p>
          <p className="mt-1 text-[12px] text-gray-900">{formatTimestamp(recording.stoppedAt)}</p>
        </div>
      </div>

      {recording.lastError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-600">
          <strong className="font-semibold">Error:</strong> {recording.lastError}
        </div>
      ) : null}

      {parsed?.kind === "session" ? (
        <div className="flex flex-1 gap-4 overflow-hidden">
          <div className="flex w-80 flex-shrink-0 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-700">
            <h3 className="text-sm font-semibold text-gray-900">Session Summary</h3>
            <dl className="space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">Session ID</dt>
                <dd className="font-mono text-gray-800">{parsed.sessionId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Start</dt>
                <dd>{parsed.startTime ? formatTimestamp(parsed.startTime) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">End</dt>
                <dd>{parsed.endTime ? formatTimestamp(parsed.endTime) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Actions</dt>
                <dd>{parsed.actions.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Speech segments</dt>
                <dd>{parsed.speechSegments.length}</dd>
              </div>
            </dl>
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
            {parsed.speechSegments.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Speech Transcript</h3>
                  <span className="text-xs text-gray-500">{parsed.speechSegments.length} segment(s)</span>
                </div>
                <ul className="mt-3 space-y-2">
                  {parsed.speechSegments.map((segment, index) => (
                    <SpeechSegmentRow key={segment?.id ?? index} segment={segment} />
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Actions</h3>
                <span className="text-xs text-gray-500">{parsed.actions.length}</span>
              </div>
              {parsed.actions.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500">No recorded actions.</p>
              ) : (
                <ul className="mt-3 space-y-2 overflow-auto pr-2">
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

  const canStart = Boolean(onStartRecording) && connection?.hasOSClient && !activeRecording;
  const canStop = Boolean(onStopRecording) && Boolean(activeRecording);

  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(activeRecording?.recordingId ?? null);

  const selectedRecording = useMemo(() => {
    if (selectedRecordingId) {
      return displayRecordings.find((recording) => recording.recordingId === selectedRecordingId) ?? null;
    }
    return displayRecordings[0] ?? null;
  }, [selectedRecordingId, displayRecordings]);

  const connectionsSection = (
    <Section
      title="Connections"
      emptyLabel="No connection data."
      action={(onStartRecording || onStopRecording) ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onStartRecording?.()}
            disabled={!canStart || recordingBusy}
            className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
          >
            {recordingBusy && !activeRecording ? 'Starting…' : 'Start Recording'}
          </button>
          <button
            type="button"
            onClick={() => selectedRecording && onStopRecording?.(selectedRecording.recordingId)}
            disabled={!canStop || recordingBusy}
            className="rounded border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
          >
            {recordingBusy && activeRecording ? 'Stopping…' : 'Stop Recording'}
          </button>
        </div>
      ) : undefined}
    >
      <div className="grid grid-cols-2 gap-3 text-xs text-[#0A1A23]">
        <div className="rounded-xl border border-[#EEF2FF] bg-[#EEF2FF]/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[#0A1A23]">OS Client</span>
            <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${connection?.hasOSClient ? 'bg-[#32AA8110] text-[#32AA81] border-[#32AA8120]' : 'bg-[#CD3A5010] text-[#CD3A50] border-[#CD3A5020]'}`}>
              {connection?.hasOSClient ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-[#EEF2FF] bg-[#EEF2FF]/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[#0A1A23]">Web Client</span>
            <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${connection?.hasWebClient ? 'bg-[#32AA8110] text-[#32AA81] border-[#32AA8120]' : 'bg-[#9AA7B410] text-[#9AA7B4] border-[#9AA7B420]'}`}>
              {connection?.hasWebClient ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
    </Section>
  );

  const recordingsPane = (
    <div className="flex h-full flex-1 overflow-hidden rounded-xl border border-[#0A1A2314] bg-white p-4">
      {displayRecordings.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF2FF]">
              <svg className="h-6 w-6 text-[#3A5AE5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-[#0A1A23]">No recordings yet</h4>
              <p className="text-xs text-[#657782]">Start a recording to see workflow execution details here.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full gap-4 overflow-hidden">
          <div className="flex w-72 flex-shrink-0 flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-sm font-semibold text-[#0A1A23]">Recordings</h3>
              <span className="text-xs text-[#657782]">{displayRecordings.length}</span>
            </div>
            <div className="flex-1 overflow-auto pr-2">
              <ul className="space-y-2">
                {displayRecordings.map((recording) => {
                  const isSelected = selectedRecording?.recordingId === recording.recordingId;
                  return (
                    <li key={recording.recordingId}>
                      <button
                        type="button"
                        onClick={() => setSelectedRecordingId(recording.recordingId)}
                        className={`flex w-full flex-col gap-1 rounded-xl border px-3 py-2 text-left text-xs transition ${
                          isSelected ? 'border-[#3A5AE5] bg-[#EEF2FF]' : 'border-[#0A1A2314] bg-white hover:border-[#3A5AE5]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#0A1A23]">{shortId(recording.recordingId)}</span>
                          <StatusBadge status={recording.status} />
                        </div>
                        <p className="text-[11px] text-[#657782]">Started {formatTimestamp(recording.createdAt)}</p>
                        {recording.stoppedAt ? (
                          <p className="text-[11px] text-[#657782]">Stopped {formatTimestamp(recording.stoppedAt)}</p>
                        ) : null}
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
    <Section
      title="Tool Requests"
      emptyLabel={status === "loading" ? "Loading…" : "No tool activity yet."}
    >
      {error ? (
        <div className="rounded-lg border border-[#CD3A5020] bg-[#CD3A5010] p-2 text-xs text-[#CD3A50]">{error}</div>
      ) : null}
      {toolRequests.map((request) => (
        <div key={request.requestId} className="rounded-xl border border-[#0A1A2314] bg-white p-3 text-xs text-[#0A1A23]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0A1A23]">{request.tool}</p>
              <p className="text-xs text-[#657782]">{shortId(request.requestId)}</p>
            </div>
            <ToolStatusBadge status={request.status} />
          </div>
          <dl className="mt-2 space-y-1">
            <div className="flex justify-between">
              <dt className="text-[#657782]">Created</dt>
              <dd className="text-[#0A1A23]">{formatTimestamp(request.createdAt)}</dd>
            </div>
            {request.resolvedAt ? (
              <div className="flex justify-between">
                <dt className="text-[#657782]">Resolved</dt>
                <dd className="text-[#0A1A23]">{formatTimestamp(request.resolvedAt)}</dd>
              </div>
            ) : null}
            {request.error ? <div className="mt-1 text-[#CD3A50]">{request.error}</div> : null}
          </dl>
        </div>
      ))}
    </Section>
  );

  const content = (
    <div className="flex h-full flex-col gap-6">
      {connectionsSection}
      {recordingsPane}
      {requestsSection}
    </div>
  );

  if (variant === "aside") {
    return (
      <aside className="hidden h-full w-96 shrink-0 flex-col gap-6 border-l border-[#0A1A2314] bg-white p-4 lg:flex">
        {content}
      </aside>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-hidden">
      {content}
    </div>
  );
};
