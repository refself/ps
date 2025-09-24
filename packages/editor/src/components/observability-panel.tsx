import { useMemo, useState } from "react";

import type {
  ObservabilityRecording,
  ObservabilityToolRequest,
  RecordingStatus,
  ToolRequestStatus,
} from "../hooks/use-observability";

import { editorTheme } from "../theme";
import { withAlpha } from "../utils/color";

const getRecordingStatusTone = (status: RecordingStatus) => {
  if (status === "recording") {
    return {
      borderColor: withAlpha(editorTheme.colors.action, 0.35),
      backgroundColor: withAlpha(editorTheme.colors.action, 0.12),
      textColor: editorTheme.colors.action,
      dotColor: editorTheme.colors.action,
    };
  }
  if (status === "completed") {
    return {
      borderColor: withAlpha(editorTheme.colors.positive, 0.35),
      backgroundColor: withAlpha(editorTheme.colors.positive, 0.12),
      textColor: editorTheme.colors.positive,
      dotColor: editorTheme.colors.positive,
    };
  }
  return {
    borderColor: withAlpha(editorTheme.colors.negative, 0.35),
    backgroundColor: withAlpha(editorTheme.colors.negative, 0.12),
    textColor: editorTheme.colors.negative,
    dotColor: editorTheme.colors.negative,
  };
};

const getToolStatusTone = (status: ToolRequestStatus) => {
  if (status === "pending") {
    return {
      borderColor: withAlpha(editorTheme.colors.action, 0.35),
      backgroundColor: withAlpha(editorTheme.colors.action, 0.12),
      textColor: editorTheme.colors.action,
    };
  }
  if (status === "success") {
    return {
      borderColor: withAlpha(editorTheme.colors.positive, 0.35),
      backgroundColor: withAlpha(editorTheme.colors.positive, 0.12),
      textColor: editorTheme.colors.positive,
    };
  }
  return {
    borderColor: withAlpha(editorTheme.colors.negative, 0.35),
    backgroundColor: withAlpha(editorTheme.colors.negative, 0.12),
    textColor: editorTheme.colors.negative,
  };
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

const StatusBadge = ({ status }: { status: RecordingStatus }) => {
  const tone = getRecordingStatusTone(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        borderColor: tone.borderColor,
        backgroundColor: tone.backgroundColor,
        color: tone.textColor,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor: tone.dotColor,
          boxShadow: status === "recording" ? `0 0 0 4px ${withAlpha(tone.dotColor, 0.15)}` : undefined,
        }}
      />
      {status === "recording" ? "Recording" : status === "completed" ? "Completed" : "Error"}
    </span>
  );
};

const ToolStatusBadge = ({ status }: { status: ToolRequestStatus }) => {
  const tone = getToolStatusTone(status);
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
      style={{
        borderColor: tone.borderColor,
        backgroundColor: tone.backgroundColor,
        color: tone.textColor,
      }}
    >
      {status === "pending" ? "Pending" : status === "success" ? "Success" : "Error"}
    </span>
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
      className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium shadow-sm transition hover:border-[var(--editor-color-action)] hover:text-[var(--editor-color-action)]"
      style={{
        borderColor: editorTheme.colors.borderSubtle,
        backgroundColor: editorTheme.colors.backgroundDefault,
        color: editorTheme.colors.shaded,
      }}
      title={`Copy ${label}`}
    >
      <span className="uppercase tracking-wide text-[10px]" style={{ color: editorTheme.colors.accentMuted }}>
        {label}
      </span>
      <span className="max-w-[140px] truncate font-mono text-[10px]" style={{ color: editorTheme.colors.shaded }}>
        {stringValue}
      </span>
      <span className="text-[10px]" style={{ color: editorTheme.colors.accentMuted }}>
        {copied ? "Saved" : "Copy"}
      </span>
    </button>
  );
};

const ActionsTable = ({ actions }: { actions: any[] }) => {
  if (!actions || actions.length === 0) {
    return (
      <div
        className="flex h-32 items-center justify-center text-sm"
        style={{ color: editorTheme.colors.accentMuted }}
      >
        No recorded actions
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-xl border shadow-sm"
      style={{
        borderColor: editorTheme.colors.borderSubtle,
        background: editorTheme.surfaces.card,
      }}
    >
      <div className="flex-1 overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
          <thead
            className="sticky top-0"
            style={{
              background: editorTheme.surfaces.card,
              color: editorTheme.colors.accentMuted,
            }}
          >
            <tr className="text-[11px] uppercase tracking-wide">
              <th className="sticky left-0 z-10 px-3 py-2" style={{ background: editorTheme.surfaces.card }}>
                #
              </th>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Element</th>
              <th className="px-3 py-2">Details</th>
              <th className="px-3 py-2">Copy</th>
            </tr>
          </thead>
          <tbody>
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
              ].filter((entry) => entry.value !== undefined && entry.value !== null && entry.value !== "");

              return (
                <tr key={action?.id ?? index} className="align-top">
                  <td
                    className="sticky left-0 z-10 px-3 py-2 font-mono"
                    style={{
                      fontSize: "11px",
                      color: editorTheme.colors.accentMuted,
                      background: editorTheme.surfaces.card,
                    }}
                  >
                    {index + 1}
                  </td>
                  <td className="px-3 py-2" style={{ color: editorTheme.colors.accentMuted }}>
                    {formatTimestamp(action?.timestamp)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        borderColor: withAlpha(editorTheme.colors.action, 0.3),
                        backgroundColor: withAlpha(editorTheme.colors.action, 0.12),
                        color: editorTheme.colors.action,
                      }}
                    >
                      {action?.type ?? "unknown"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold" style={{ color: editorTheme.colors.foreground }}>
                        {elementRole}
                      </span>
                      {elementTitle ? (
                        <span className="truncate text-[11px]" style={{ color: editorTheme.colors.accentMuted }}>
                          {elementTitle}
                        </span>
                      ) : null}
                      {element?.frame ? (
                        <span className="font-mono text-[10px]" style={{ color: editorTheme.colors.accentMuted }}>
                          ({element.frame.x}, {element.frame.y}) · {element.frame.width}×{element.frame.height}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1" style={{ color: editorTheme.colors.shaded }}>
                      {location ? (
                        <span className="text-[11px]" style={{ color: editorTheme.colors.accentMuted }}>
                          {location}
                        </span>
                      ) : null}
                      {description ? (
                        <span className="text-sm" style={{ color: editorTheme.colors.foreground }}>
                          {description}
                        </span>
                      ) : null}
                      <details>
                        <summary
                          className="cursor-pointer text-[11px]"
                          style={{ color: editorTheme.colors.action }}
                        >
                          Raw
                        </summary>
                        <pre
                          className="mt-1 max-h-40 overflow-auto rounded border p-2 text-[11px] whitespace-pre-wrap"
                          style={{
                            borderColor: editorTheme.colors.borderSubtle,
                            background: editorTheme.colors.backgroundSoft,
                            color: editorTheme.colors.shaded,
                          }}
                        >
                          {JSON.stringify(action, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {copyTargets.length > 0
                        ? copyTargets.map((target) => (
                            <CopyButton key={target.label} label={target.label} value={target.value} />
                          ))
                        : <CopyButton label="JSON" value={action} />}
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
  <li
    className="rounded-lg border p-3 shadow-sm"
    style={{
      borderColor: editorTheme.colors.borderSubtle,
      background: editorTheme.surfaces.card,
    }}
  >
    <p className="mb-1 text-sm font-medium" style={{ color: editorTheme.colors.foreground }}>
      {segment?.text ?? "(no transcript)"}
    </p>
    <div className="flex items-center gap-3 text-[11px]" style={{ color: editorTheme.colors.accentMuted }}>
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

  const durationSeconds = useMemo(() => {
    if (parsed && parsed.kind === "session" && parsed.startTime && parsed.endTime) {
      const start = new Date(parsed.startTime).getTime();
      const end = new Date(parsed.endTime).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
        return Math.round((end - start) / 1000);
      }
    }
    return null;
  }, [parsed]);

  return (
    <div className="flex h-full flex-1 flex-col gap-3 overflow-hidden">
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
        style={{
          borderColor: editorTheme.colors.borderSubtle,
          background: editorTheme.surfaces.card,
        }}
      >
        <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: editorTheme.colors.accentMuted }}>
          <div className="flex items-center gap-1">
            <span className="uppercase tracking-wide">Recording</span>
            <span className="font-mono text-sm" style={{ color: editorTheme.colors.foreground }}>
              {shortId(recording.recordingId)}
            </span>
          </div>
          <div className="h-3 w-px" style={{ background: editorTheme.colors.borderMuted }} />
          <span>Started {formatTimestamp(recording.createdAt)}</span>
          {recording.stoppedAt ? (
            <>
              <div className="h-3 w-px" style={{ background: editorTheme.colors.borderMuted }} />
              <span>Stopped {formatTimestamp(recording.stoppedAt)}</span>
            </>
          ) : null}
        </div>
        <StatusBadge status={recording.status} />
      </div>

      {recording.lastError ? (
        <div
          className="rounded-xl border px-4 py-3 text-xs"
          style={{
            borderColor: withAlpha(editorTheme.colors.negative, 0.35),
            background: withAlpha(editorTheme.colors.negative, 0.12),
            color: editorTheme.colors.negative,
          }}
        >
          <strong className="font-semibold">Error:</strong> {recording.lastError}
        </div>
      ) : null}

      <div className="flex flex-1 gap-4 min-h-0">
        <div className="flex w-[320px] flex-col gap-3 min-h-0">
          <div
            className="rounded-xl border px-3 py-3"
            style={{
              borderColor: editorTheme.colors.borderSubtle,
              background: editorTheme.surfaces.card,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold" style={{ color: editorTheme.colors.foreground }}>
                Session Summary
              </h3>
              {parsed?.kind === "session" ? (
                <span className="font-mono text-[11px]" style={{ color: editorTheme.colors.accentMuted }}>
                  {shortId(parsed.sessionId)}
                </span>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm" style={{ color: editorTheme.colors.foreground }}>
              <div
                className="rounded-lg border px-3 py-2"
                style={{ borderColor: editorTheme.colors.borderSubtle, background: editorTheme.colors.backgroundSoft }}
              >
                <p className="text-[10px] uppercase tracking-wide" style={{ color: editorTheme.colors.accentMuted }}>
                  Actions
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {parsed?.kind === "session" ? parsed.actions.length : parsed?.actions?.length ?? 0}
                </p>
              </div>
              <div
                className="rounded-lg border px-3 py-2"
                style={{ borderColor: editorTheme.colors.borderSubtle, background: editorTheme.colors.backgroundSoft }}
              >
                <p className="text-[10px] uppercase tracking-wide" style={{ color: editorTheme.colors.accentMuted }}>
                  Speech
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {parsed?.kind === "session" ? parsed.speechSegments.length : 0}
                </p>
              </div>
              <div
                className="col-span-2 rounded-lg border px-3 py-2"
                style={{ borderColor: editorTheme.colors.borderSubtle, background: editorTheme.colors.backgroundSoft }}
              >
                <p className="text-[10px] uppercase tracking-wide" style={{ color: editorTheme.colors.accentMuted }}>
                  Duration
                </p>
                <p className="mt-1 text-sm font-semibold" style={{ color: editorTheme.colors.foreground }}>
                  {durationSeconds !== null
                    ? `${durationSeconds}s`
                    : parsed?.kind === "session" && parsed.startTime
                    ? "In progress"
                    : "—"}
                </p>
              </div>
            </div>
            {parsed?.kind === "session" && parsed.options ? (
              <div className="mt-3 rounded-lg border px-3 py-2" style={{ borderColor: editorTheme.colors.borderSubtle }}>
                <p className="mb-2 text-[10px] uppercase tracking-wide" style={{ color: editorTheme.colors.accentMuted }}>
                  Recording Options
                </p>
                <dl className="space-y-1 text-[11px]" style={{ color: editorTheme.colors.shaded }}>
                  {Object.entries(parsed.options).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <dt className="uppercase tracking-wide" style={{ color: editorTheme.colors.accentMuted }}>
                        {key}
                      </dt>
                      <dd className="font-medium" style={{ color: editorTheme.colors.foreground }}>
                        {String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setShowRaw((prev) => !prev)}
              className="mt-3 self-start text-[11px] font-medium underline-offset-4 transition hover:underline"
              style={{ color: editorTheme.colors.action }}
            >
              {showRaw ? "Hide raw payload" : "Show raw payload"}
            </button>
          </div>

          <div
            className="flex flex-1 flex-col gap-2 overflow-hidden rounded-xl border px-3 py-3"
            style={{
              borderColor: editorTheme.colors.borderSubtle,
              background: editorTheme.surfaces.card,
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: editorTheme.colors.foreground }}>
                Narration
              </h3>
              <span className="text-[11px]" style={{ color: editorTheme.colors.accentMuted }}>
                {parsed?.kind === "session" ? parsed.speechSegments.length : 0}
              </span>
            </div>
            <div className="flex-1 overflow-auto rounded-lg border"
              style={{ borderColor: editorTheme.colors.borderSubtle, background: editorTheme.colors.backgroundSoft }}
            >
              {parsed?.kind === "session" && parsed.speechSegments.length > 0 ? (
                <ul className="space-y-2 p-3">
                  {parsed.speechSegments.map((segment, index) => (
                    <SpeechSegmentRow key={segment?.id ?? index} segment={segment} />
                  ))}
                </ul>
              ) : (
                <div className="flex h-full items-center justify-center text-[11px]"
                  style={{ color: editorTheme.colors.accentMuted }}
                >
                  No narration recorded
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col min-h-0">
          <div
            className="flex items-center justify-between rounded-xl border px-4 py-3"
            style={{
              borderColor: editorTheme.colors.borderSubtle,
              background: editorTheme.surfaces.card,
            }}
          >
            <h3 className="text-sm font-semibold" style={{ color: editorTheme.colors.foreground }}>
              Actions
            </h3>
            <span className="text-[11px]" style={{ color: editorTheme.colors.accentMuted }}>
              {parsed?.kind === "session" ? parsed.actions.length : parsed?.actions?.length ?? 0}
            </span>
          </div>
          <div className="mt-2 flex-1 min-h-0">
            <ActionsTable actions={parsed?.kind === "session" ? parsed.actions : parsed?.actions ?? []} />
          </div>
        </div>
      </div>

      {showRaw && parsed ? (
        <div
          className="max-h-[240px] overflow-auto rounded-xl border px-4 py-3 text-[11px]"
          style={{
            borderColor: editorTheme.colors.borderSubtle,
            background: editorTheme.surfaces.card,
            color: editorTheme.colors.shaded,
          }}
        >
          <p className="text-[10px] uppercase tracking-wide" style={{ color: editorTheme.colors.accentMuted }}>
            Raw Payload
          </p>
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
    <div
      className="flex items-center justify-between rounded-2xl border px-4 py-3"
      style={{
        borderColor: editorTheme.colors.borderSubtle,
        background: editorTheme.surfaces.card,
      }}
    >
      <div className="flex items-center gap-3 text-sm" style={{ color: editorTheme.colors.foreground }}>
        <div
          className="flex items-center gap-2 rounded-full border px-3 py-1"
          style={{
            borderColor: editorTheme.colors.borderSubtle,
            background: editorTheme.colors.backgroundSoft,
          }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: connection?.hasOSClient ? editorTheme.colors.positive : editorTheme.colors.borderMuted,
            }}
          />
          <span className="font-medium">Desktop App</span>
          <span className="text-xs uppercase tracking-wide" style={{ color: editorTheme.colors.accentMuted }}>
            {connection?.hasOSClient ? "Connected" : "Required"}
          </span>
        </div>
        <div
          className="flex items-center gap-2 rounded-full border px-3 py-1"
          style={{
            borderColor: editorTheme.colors.borderSubtle,
            background: editorTheme.colors.backgroundSoft,
          }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: connection?.hasWebClient ? editorTheme.colors.action : editorTheme.colors.borderMuted,
            }}
          />
          <span className="font-medium">Browser</span>
          <span className="text-xs uppercase tracking-wide" style={{ color: editorTheme.colors.accentMuted }}>
            {connection?.hasWebClient ? "Connected" : "Offline"}
          </span>
        </div>
      </div>
      {(onStartRecording || onStopRecording) && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onStartRecording?.()}
            disabled={!canStart || recordingBusy}
            className="rounded-full border px-4 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              borderColor: editorTheme.colors.action,
              backgroundColor: withAlpha(editorTheme.colors.action, 0.12),
              color: editorTheme.colors.action,
            }}
          >
            {recordingBusy && !activeRecording ? "Starting…" : "Start Recording"}
          </button>
          <button
            type="button"
            onClick={() => selectedRecording && onStopRecording?.(selectedRecording.recordingId)}
            disabled={!canStop || recordingBusy}
            className="rounded-full border px-4 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              borderColor: editorTheme.colors.negative,
              backgroundColor: withAlpha(editorTheme.colors.negative, 0.12),
              color: editorTheme.colors.negative,
            }}
          >
            {recordingBusy && activeRecording ? "Stopping…" : "Stop Recording"}
          </button>
        </div>
      )}
    </div>
  );

  const recordingsPane = (
    <div className="flex h-full flex-1 overflow-hidden">
      {displayRecordings.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center">
          <div
            className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border px-6 py-8 text-center"
            style={{
              borderColor: editorTheme.colors.borderSubtle,
              background: editorTheme.surfaces.card,
            }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                background: editorTheme.colors.backgroundSoft,
                color: editorTheme.colors.accentMuted,
              }}
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold" style={{ color: editorTheme.colors.foreground }}>
                No recordings yet
              </h4>
              <p className="text-sm" style={{ color: editorTheme.colors.shaded }}>
                Start a recording to capture workflow execution details.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid h-full w-full grid-cols-[260px_1fr] gap-4 overflow-hidden">
          <div
            className="flex flex-col gap-2 rounded-2xl border px-3 py-3"
            style={{
              borderColor: editorTheme.colors.borderSubtle,
              background: editorTheme.surfaces.card,
            }}
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold" style={{ color: editorTheme.colors.foreground }}>
                Recordings
              </h3>
              <span className="text-[11px]" style={{ color: editorTheme.colors.accentMuted }}>
                {displayRecordings.length}
              </span>
            </div>
            <div className="-mx-1 flex-1 overflow-auto px-1">
              <ul className="space-y-2">
                {displayRecordings.map((recording) => {
                  const isSelected = selectedRecording?.recordingId === recording.recordingId;
                  return (
                    <li key={recording.recordingId}>
                      <button
                        type="button"
                        onClick={() => setSelectedRecordingId(recording.recordingId)}
                        className="w-full rounded-xl border px-3 py-2 text-left transition"
                        style={{
                          borderColor: isSelected
                            ? withAlpha(editorTheme.colors.action, 0.4)
                            : editorTheme.colors.borderSubtle,
                          backgroundColor: isSelected
                            ? withAlpha(editorTheme.colors.action, 0.12)
                            : editorTheme.surfaces.card,
                          boxShadow: isSelected ? "0 10px 20px rgba(10,26,35,0.12)" : "0 4px 12px rgba(10,26,35,0.06)",
                          color: editorTheme.colors.foreground,
                        }}
                      >
                        <div className="flex items-center justify-between text-sm font-semibold">
                          <span>{shortId(recording.recordingId)}</span>
                          <StatusBadge status={recording.status} />
                        </div>
                        <div className="mt-1 space-y-0.5 text-[11px]" style={{ color: editorTheme.colors.accentMuted }}>
                          <p>Started {formatTimestamp(recording.createdAt)}</p>
                          {recording.stoppedAt ? <p>Stopped {formatTimestamp(recording.stoppedAt)}</p> : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <div
            className="flex flex-1 overflow-hidden rounded-2xl border px-4 py-3"
            style={{
              borderColor: editorTheme.colors.borderSubtle,
              background: editorTheme.colors.backgroundSoft,
            }}
          >
            {selectedRecording ? (
              <RecordingDetail recording={selectedRecording} />
            ) : (
              <div className="flex w-full items-center justify-center text-[11px]" style={{ color: editorTheme.colors.accentMuted }}>
                Select a recording to view details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const requestsSection = (
    <div
      className="rounded-2xl border px-4 py-3"
      style={{
        borderColor: editorTheme.colors.borderSubtle,
        background: editorTheme.surfaces.card,
      }}
    >
      <h3 className="mb-2 text-sm font-semibold" style={{ color: editorTheme.colors.foreground }}>
        Tool Requests
      </h3>
      {error && (
        <div
          className="mb-3 rounded-lg border px-3 py-2 text-sm"
          style={{
            borderColor: withAlpha(editorTheme.colors.negative, 0.35),
            background: withAlpha(editorTheme.colors.negative, 0.12),
            color: editorTheme.colors.negative,
          }}
        >
          {error}
        </div>
      )}
      {toolRequests.length === 0 ? (
        <p className="text-sm" style={{ color: editorTheme.colors.accentMuted }}>
          No tool activity
        </p>
      ) : (
        <div className="space-y-3">
          {toolRequests.map((request) => (
            <div
              key={request.requestId}
              className="rounded-xl border px-3 py-3"
              style={{
                borderColor: editorTheme.colors.borderSubtle,
                background: editorTheme.colors.backgroundSoft,
              }}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold" style={{ color: editorTheme.colors.foreground }}>
                    {request.tool}
                  </p>
                  <p className="font-mono text-[11px]" style={{ color: editorTheme.colors.accentMuted }}>
                    {shortId(request.requestId)}
                  </p>
                </div>
                <ToolStatusBadge status={request.status} />
              </div>
              <div className="space-y-1 text-[11px]" style={{ color: editorTheme.colors.accentMuted }}>
                <p>Created {formatTimestamp(request.createdAt)}</p>
                {request.resolvedAt ? <p>Resolved {formatTimestamp(request.resolvedAt)}</p> : null}
                {request.error ? (
                  <p style={{ color: editorTheme.colors.negative }}>{request.error}</p>
                ) : null}
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
      <aside
        className="hidden h-full w-96 shrink-0 flex-col overflow-hidden border-l p-4 backdrop-blur lg:flex"
        style={{
          borderColor: editorTheme.colors.borderSubtle,
          background: editorTheme.surfaces.card,
        }}
      >
        <div className="flex h-full flex-col overflow-y-auto pr-2" style={{ gap: "1rem" }}>
          {content}
        </div>
      </aside>
    );
  }

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-3xl border p-6"
      style={{
        borderColor: editorTheme.colors.borderSubtle,
        background: editorTheme.colors.backgroundSoft,
      }}
    >
      <div className="flex h-full flex-col overflow-y-auto pr-2">
        {content}
      </div>
    </div>
  );
};
