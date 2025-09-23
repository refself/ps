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

const shortId = (value: string) => (value.length > 8 ? `${value.slice(0, 4)}…${value.slice(-4)}` : value);

const formatTimestamp = (value: number | null | undefined) => {
  if (!value) {
    return "—";
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
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
}: {
  title: string;
  emptyLabel: string;
  children: ReactNode;
}) => {
  const count = Children.count(children);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {count > 0 ? <div className="flex flex-col gap-3">{children}</div> : <p className="text-xs text-gray-500">{emptyLabel}</p>}
    </section>
  );
};

export const ObservabilityPanel = ({
  recordings,
  toolRequests,
  status,
  error,
  connection,
}: {
  recordings: ObservabilityRecording[];
  toolRequests: ObservabilityToolRequest[];
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
  connection?: {
    hasOSClient: boolean;
    hasWebClient: boolean;
  };
}) => (
  <aside className="hidden h-full w-96 shrink-0 flex-col gap-6 border-l border-gray-200 bg-white p-4 lg:flex">
    <Section title="Connections" emptyLabel="No connection data.">
      <div className="flex flex-col gap-2 rounded border border-gray-200 p-3 text-xs text-gray-700">
        <div className="flex items-center justify-between">
          <span>OS Client</span>
          <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${connection?.hasOSClient ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
            {connection?.hasOSClient ? 'Connected' : 'Not Connected'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Web Client</span>
          <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${connection?.hasWebClient ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {connection?.hasWebClient ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </Section>
    <Section title="Recordings" emptyLabel="No recordings yet.">
      {recordings.map((recording) => (
        <div key={recording.recordingId} className="rounded border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">{shortId(recording.recordingId)}</span>
            <StatusBadge status={recording.status} />
          </div>
          <dl className="mt-2 space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <dt>Started</dt>
              <dd>{formatTimestamp(recording.createdAt)}</dd>
            </div>
            {recording.stoppedAt ? (
              <div className="flex justify-between">
                <dt>Stopped</dt>
                <dd>{formatTimestamp(recording.stoppedAt)}</dd>
              </div>
            ) : null}
            {recording.lastError ? <div className="mt-1 text-red-500">{recording.lastError}</div> : null}
          </dl>
        </div>
      ))}
    </Section>
    <Section
      title="Tool Requests"
      emptyLabel={status === "loading" ? "Loading…" : "No tool activity yet."}
    >
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-600">{error}</div>
      ) : null}
      {toolRequests.map((request) => (
        <div key={request.requestId} className="rounded border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{request.tool}</p>
              <p className="text-xs text-gray-500">{shortId(request.requestId)}</p>
            </div>
            <ToolStatusBadge status={request.status} />
          </div>
          <dl className="mt-2 space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <dt>Created</dt>
              <dd>{formatTimestamp(request.createdAt)}</dd>
            </div>
            {request.resolvedAt ? (
              <div className="flex justify-between">
                <dt>Resolved</dt>
                <dd>{formatTimestamp(request.resolvedAt)}</dd>
              </div>
            ) : null}
            {request.error ? <div className="mt-1 text-red-500">{request.error}</div> : null}
          </dl>
        </div>
      ))}
    </Section>
  </aside>
);
