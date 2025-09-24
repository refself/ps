import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from "react";
const recordingTone = {
    recording: "bg-orange-100 text-orange-800 border-orange-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    error: "bg-red-100 text-red-800 border-red-200",
};
const toolTone = {
    pending: "bg-blue-50 text-blue-600 border-blue-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    error: "bg-red-50 text-red-600 border-red-200",
};
const shortId = (value) => (value.length > 10 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value);
const formatTimestamp = (value) => {
    if (!value) {
        return "—";
    }
    const date = typeof value === "number" ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return date.toLocaleString();
};
const StatusBadge = ({ status }) => (_jsxs("span", { className: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${recordingTone[status]}`, children: [_jsx("div", { className: `h-1.5 w-1.5 rounded-full ${status === "recording" ? "bg-orange-500 animate-pulse" :
                status === "completed" ? "bg-green-500" : "bg-red-500"}` }), status === "recording" ? "Recording" : status === "completed" ? "Completed" : "Error"] }));
const ToolStatusBadge = ({ status }) => (_jsx("span", { className: `rounded border px-2 py-0.5 text-xs font-semibold ${toolTone[status]}`, children: status === "pending" ? "Pending" : status === "success" ? "Success" : "Error" }));
const parseRecordingData = (recording) => {
    const payload = recording.data;
    if (!payload || typeof payload !== "object") {
        return null;
    }
    if ("sessionId" in payload && Array.isArray(payload.actions)) {
        const metadata = typeof payload.metadata === "object" ? payload.metadata : null;
        return {
            kind: "session",
            sessionId: String(payload.sessionId ?? recording.recordingId),
            startTime: payload.startTime ? String(payload.startTime) : undefined,
            endTime: payload.endTime ? String(payload.endTime) : null,
            actions: Array.isArray(payload.actions) ? payload.actions : [],
            speechSegments: Array.isArray(payload.speechSegments) ? payload.speechSegments : [],
            options: typeof payload.recordingOptions === "object" ? payload.recordingOptions : undefined,
            metadata,
            raw: payload,
        };
    }
    if (Array.isArray(payload.content)) {
        return {
            kind: "actions",
            actions: payload.content,
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
const ActionRow = ({ action, index }) => {
    const label = action?.type ? String(action.type) : `Action ${index + 1}`;
    const timestamp = action?.timestamp ? formatTimestamp(action.timestamp) : "—";
    const description = action?.visionActionDescription || action?.speechTranscript || action?.text;
    const location = action?.appName || action?.windowTitle;
    return (_jsx("li", { className: "group border-b border-gray-100 p-4 hover:bg-gray-50/50", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700", children: index + 1 }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("p", { className: "text-sm font-medium text-gray-900 truncate", children: label }), _jsx("span", { className: "text-xs text-gray-500 ml-2", children: timestamp })] }), location && _jsx("p", { className: "text-xs text-gray-500 mb-1", children: location }), description && _jsx("p", { className: "text-sm text-gray-700 mb-2", children: description }), _jsxs("details", { className: "group/details", children: [_jsx("summary", { className: "cursor-pointer text-xs text-blue-600 hover:text-blue-800 select-none", children: "View raw data" }), _jsx("pre", { className: "mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap max-h-32", children: JSON.stringify(action, null, 2) })] })] })] }) }));
};
const SpeechSegmentRow = ({ segment }) => (_jsxs("li", { className: "border-l-4 border-purple-200 bg-purple-50/50 p-3 rounded-r-lg", children: [_jsx("p", { className: "font-medium text-gray-900 mb-1", children: segment?.text ?? "(no transcript)" }), _jsxs("div", { className: "flex items-center gap-4 text-xs text-gray-500", children: [_jsx("span", { children: segment?.timestamp ?? "—" }), typeof segment?.confidence === "number" && (_jsxs("span", { children: [(segment.confidence * 100).toFixed(0), "% confidence"] }))] })] }));
const RecordingDetail = ({ recording }) => {
    const parsed = useMemo(() => parseRecordingData(recording), [recording]);
    const [showRaw, setShowRaw] = useState(false);
    return (_jsxs("div", { className: "flex h-full flex-1 flex-col gap-4 overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between p-4 bg-gray-50 rounded-lg border", children: [_jsxs("div", { className: "flex items-center gap-6", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: "Recording ID" }), _jsx("p", { className: "font-mono text-sm text-gray-900", children: shortId(recording.recordingId) })] }), _jsx("div", { className: "h-8 w-px bg-gray-200" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: "Started" }), _jsx("p", { className: "text-sm text-gray-900", children: formatTimestamp(recording.createdAt) })] }), recording.stoppedAt && (_jsxs(_Fragment, { children: [_jsx("div", { className: "h-8 w-px bg-gray-200" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: "Stopped" }), _jsx("p", { className: "text-sm text-gray-900", children: formatTimestamp(recording.stoppedAt) })] })] }))] }), _jsx(StatusBadge, { status: recording.status })] }), recording.lastError ? (_jsxs("div", { className: "rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-600", children: [_jsx("strong", { className: "font-semibold", children: "Error:" }), " ", recording.lastError] })) : null, parsed?.kind === "session" ? (_jsxs("div", { className: "flex flex-1 gap-6 overflow-hidden", children: [_jsxs("div", { className: "flex w-72 flex-shrink-0 flex-col gap-4 bg-gray-50 p-4 rounded-lg", children: [_jsx("h3", { className: "text-base font-semibold text-gray-900", children: "Session Summary" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-gray-500 uppercase tracking-wide", children: "Session ID" }), _jsx("p", { className: "mt-1 font-mono text-sm text-gray-900", children: shortId(parsed.sessionId) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-gray-500 uppercase tracking-wide", children: "Actions" }), _jsx("p", { className: "mt-1 text-lg font-semibold text-gray-900", children: parsed.actions.length })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-gray-500 uppercase tracking-wide", children: "Speech" }), _jsx("p", { className: "mt-1 text-lg font-semibold text-gray-900", children: parsed.speechSegments.length })] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-gray-500 uppercase tracking-wide", children: "Duration" }), _jsx("p", { className: "mt-1 text-sm text-gray-900", children: parsed.startTime && parsed.endTime ?
                                                    `${Math.round((new Date(parsed.endTime).getTime() - new Date(parsed.startTime).getTime()) / 1000)}s` :
                                                    parsed.startTime ? 'In progress' : '—' })] })] }), parsed.options ? (_jsxs("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-2", children: [_jsx("p", { className: "text-[11px] uppercase tracking-wide text-[#657782]", children: "Recording Options" }), _jsx("ul", { className: "mt-1 space-y-1 text-[11px] text-gray-600", children: Object.entries(parsed.options).map(([key, value]) => (_jsxs("li", { children: [key, ": ", String(value)] }, key))) })] })) : null, _jsx("button", { type: "button", onClick: () => setShowRaw((prev) => !prev), className: "rounded border border-[#3A5AE5] bg-[#EEF2FF] px-3 py-1 text-[11px] font-semibold text-[#3A5AE5] transition hover:bg-[#e1e7ff]", children: showRaw ? "Hide Raw Payload" : "Show Raw Payload" })] }), _jsxs("div", { className: "flex flex-1 flex-col gap-4 overflow-hidden", children: [parsed.speechSegments.length > 0 && (_jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h3", { className: "text-base font-semibold text-gray-900", children: "Speech Transcript" }), _jsx("span", { className: "text-sm text-gray-500", children: parsed.speechSegments.length })] }), _jsx("ul", { className: "space-y-2", children: parsed.speechSegments.map((segment, index) => (_jsx(SpeechSegmentRow, { segment: segment }, segment?.id ?? index))) })] })), _jsxs("div", { className: "flex-1 overflow-hidden bg-white rounded-lg border border-gray-200", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-gray-100", children: [_jsx("h3", { className: "text-base font-semibold text-gray-900", children: "Actions" }), _jsx("span", { className: "text-sm text-gray-500", children: parsed.actions.length })] }), parsed.actions.length === 0 ? (_jsx("div", { className: "flex items-center justify-center h-32", children: _jsx("p", { className: "text-sm text-gray-500", children: "No recorded actions" }) })) : (_jsx("ul", { className: "overflow-auto max-h-[calc(100%-4rem)]", children: parsed.actions.map((action, index) => (_jsx(ActionRow, { action: action, index: index }, action?.id ?? index))) }))] })] })] })) : (_jsxs("div", { className: "flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-900", children: "Actions" }), _jsx("span", { className: "text-xs text-gray-500", children: parsed?.kind === "actions" ? parsed.actions.length : 0 })] }), parsed && parsed.actions.length > 0 ? (_jsx("ul", { className: "mt-3 space-y-2 overflow-auto pr-2", children: parsed.actions.map((action, index) => (_jsx(ActionRow, { action: action, index: index }, action?.id ?? index))) })) : (_jsx("p", { className: "mt-2 text-xs text-gray-500", children: "No recorded actions." }))] })), showRaw && parsed ? (_jsxs("div", { className: "max-h-[280px] overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-[11px] text-gray-700", children: [_jsx("p", { className: "text-[11px] font-semibold uppercase tracking-wide text-[#657782]", children: "Raw Payload" }), _jsx("pre", { className: "mt-2 whitespace-pre-wrap", children: JSON.stringify(parsed.raw ?? recording.data, null, 2) })] })) : null] }));
};
export const ObservabilityPanel = ({ recordings, toolRequests, status, error, connection, onStartRecording, onStopRecording, recordingBusy = false, activeRecordingId, variant = 'aside', }) => {
    const activeRecording = recordings.find((recording) => recording.status === "recording") ||
        (activeRecordingId
            ? {
                recordingId: activeRecordingId,
                status: "recording",
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
    const [selectedRecordingId, setSelectedRecordingId] = useState(activeRecording?.recordingId ?? null);
    const selectedRecording = useMemo(() => {
        if (selectedRecordingId) {
            return displayRecordings.find((recording) => recording.recordingId === selectedRecordingId) ?? null;
        }
        return displayRecordings[0] ?? null;
    }, [selectedRecordingId, displayRecordings]);
    const connectionsSection = (_jsxs("div", { className: "flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `h-2 w-2 rounded-full ${connection?.hasOSClient ? 'bg-green-500' : 'bg-gray-300'}` }), _jsx("span", { className: "text-sm text-gray-700", children: "Desktop App" }), connection?.hasOSClient ? (_jsx("span", { className: "text-xs text-green-600 font-medium", children: "Connected" })) : (_jsx("span", { className: "text-xs text-gray-500", children: "Required for recording" }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `h-2 w-2 rounded-full ${connection?.hasWebClient ? 'bg-blue-500' : 'bg-gray-300'}` }), _jsx("span", { className: "text-sm text-gray-700", children: "Browser" })] })] }), (onStartRecording || onStopRecording) && (_jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: () => onStartRecording?.(), disabled: !canStart || recordingBusy, className: "px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: recordingBusy && !activeRecording ? 'Starting…' : 'Start Recording' }), _jsx("button", { type: "button", onClick: () => selectedRecording && onStopRecording?.(selectedRecording.recordingId), disabled: !canStop || recordingBusy, className: "px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: recordingBusy && activeRecording ? 'Stopping…' : 'Stop Recording' })] }))] }));
    const recordingsPane = (_jsx("div", { className: "flex h-full flex-1 overflow-hidden bg-white", children: displayRecordings.length === 0 ? (_jsx("div", { className: "flex h-full w-full items-center justify-center", children: _jsxs("div", { className: "flex max-w-sm flex-col items-center gap-6 text-center", children: [_jsx("div", { className: "flex h-16 w-16 items-center justify-center rounded-full bg-gray-100", children: _jsx("svg", { className: "h-8 w-8 text-gray-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" }) }) }), _jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "text-lg font-medium text-gray-900", children: "No recordings yet" }), _jsx("p", { className: "text-sm text-gray-500", children: "Start a recording to capture workflow execution details." })] })] }) })) : (_jsxs("div", { className: "flex h-full w-full gap-6 overflow-hidden", children: [_jsxs("div", { className: "flex w-80 flex-shrink-0 flex-col overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between px-1 pb-4", children: [_jsx("h3", { className: "text-base font-semibold text-gray-900", children: "Recordings" }), _jsx("span", { className: "text-sm text-gray-500", children: displayRecordings.length })] }), _jsx("div", { className: "flex-1 overflow-auto", children: _jsx("ul", { className: "space-y-1", children: displayRecordings.map((recording) => {
                                    const isSelected = selectedRecording?.recordingId === recording.recordingId;
                                    return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => setSelectedRecordingId(recording.recordingId), className: `flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition ${isSelected ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "font-medium text-gray-900", children: shortId(recording.recordingId) }), _jsx(StatusBadge, { status: recording.status })] }), _jsxs("div", { className: "text-xs text-gray-500 space-y-0.5", children: [_jsxs("p", { children: ["Started ", formatTimestamp(recording.createdAt)] }), recording.stoppedAt && (_jsxs("p", { children: ["Stopped ", formatTimestamp(recording.stoppedAt)] }))] })] }) }, recording.recordingId));
                                }) }) })] }), _jsx("div", { className: "flex flex-1 overflow-hidden", children: selectedRecording ? (_jsx(RecordingDetail, { recording: selectedRecording })) : (_jsx("div", { className: "flex w-full items-center justify-center rounded-xl border border-dashed border-[#0A1A2314] bg-[#F5F6F9] text-xs text-[#657782]", children: "Select a recording to view details." })) })] })) }));
    const requestsSection = (_jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-4", children: [_jsx("h3", { className: "text-base font-semibold text-gray-900 mb-3", children: "Tool Requests" }), error && (_jsx("div", { className: "mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700", children: error })), toolRequests.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500", children: "No tool activity" })) : (_jsx("div", { className: "space-y-3", children: toolRequests.map((request) => (_jsxs("div", { className: "border-l-4 border-blue-200 bg-blue-50/50 p-3 rounded-r-lg", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-gray-900", children: request.tool }), _jsx("p", { className: "text-xs text-gray-500", children: shortId(request.requestId) })] }), _jsx(ToolStatusBadge, { status: request.status })] }), _jsxs("div", { className: "text-xs text-gray-600 space-y-1", children: [_jsxs("p", { children: ["Created: ", formatTimestamp(request.createdAt)] }), request.resolvedAt && (_jsxs("p", { children: ["Resolved: ", formatTimestamp(request.resolvedAt)] })), request.error && (_jsx("p", { className: "text-red-600 mt-2", children: request.error }))] })] }, request.requestId))) }))] }));
    const content = (_jsxs("div", { className: "flex h-full flex-col gap-4", children: [connectionsSection, _jsx("div", { className: "flex-1 overflow-hidden", children: recordingsPane }), toolRequests.length > 0 && requestsSection] }));
    if (variant === "aside") {
        return (_jsx("aside", { className: "hidden h-full w-96 shrink-0 flex-col border-l border-gray-200 bg-white p-4 lg:flex", children: content }));
    }
    return (_jsx("div", { className: "flex h-full w-full flex-col overflow-hidden p-6", children: content }));
};
