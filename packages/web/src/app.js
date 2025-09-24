import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkflowEditor } from "@workflow-builder/editor";
import WorkflowList from "./components/workflow-list";
import { useWorkspaceStore, useActiveWorkflow } from "./state/workspace-store";
import { useWebSocketManager } from "./hooks/use-websocket-manager";
import { useRecordings } from "./hooks/use-recordings";
import { WORKER_BASE_URL } from "./services/workflow-api";
const API_KEY = (import.meta.env.VITE_WORKER_API_KEY ?? "").trim() || undefined;
const App = () => {
    useWorkspaceSynchronization();
    const activeWorkflow = useActiveWorkflow();
    const { status: wsStatus, manager: wsManager } = useWebSocketManager();
    const recordingsData = useRecordings(activeWorkflow?.id ?? null);
    const updateActiveWorkflow = useWorkspaceStore((state) => state.updateActiveWorkflow);
    const clearActiveWorkflow = useWorkspaceStore((state) => state.clearActiveWorkflow);
    const saveWorkflowVersion = useWorkspaceStore((state) => state.saveWorkflowVersion);
    const restoreWorkflowVersion = useWorkspaceStore((state) => state.restoreWorkflowVersion);
    const renameWorkflowVersion = useWorkspaceStore((state) => state.renameWorkflowVersion);
    const deleteWorkflowVersion = useWorkspaceStore((state) => state.deleteWorkflowVersion);
    const refreshActiveWorkflow = useWorkspaceStore((state) => state.refreshActiveWorkflow);
    const [activeRecordingId, setActiveRecordingId] = useState(null);
    const [recordingError, setRecordingError] = useState(null);
    const [recordingBusy, setRecordingBusy] = useState(false);
    const latestDocumentRef = useRef(activeWorkflow?.document ?? null);
    const latestCodeRef = useRef(activeWorkflow?.code ?? "");
    useEffect(() => {
        latestDocumentRef.current = activeWorkflow?.document ?? null;
        latestCodeRef.current = activeWorkflow?.code ?? "";
    }, [activeWorkflow?.document, activeWorkflow?.code, activeWorkflow?.id]);
    // Handle WebSocket connection status changes
    useEffect(() => {
        if (wsStatus.error) {
            setRecordingError(`Connection error: ${wsStatus.error}`);
        }
        else if (wsStatus.connected && recordingError?.includes('Connection error')) {
            setRecordingError(null); // Clear connection errors when connected
        }
    }, [wsStatus.error, wsStatus.connected, recordingError]);
    const handleDocumentChange = useCallback((next) => {
        latestDocumentRef.current = next;
        updateActiveWorkflow({ document: next, code: latestCodeRef.current });
    }, [updateActiveWorkflow]);
    const handleCodeChange = useCallback((next) => {
        latestCodeRef.current = next;
        const document = latestDocumentRef.current ?? activeWorkflow?.document;
        if (document) {
            updateActiveWorkflow({ document, code: next });
        }
    }, [activeWorkflow?.document, updateActiveWorkflow]);
    const handleRunScript = useCallback(async ({ enableNarration }) => {
        if (!activeWorkflow) {
            return { ok: false, error: "Workflow not selected." };
        }
        if (!wsStatus.connected) {
            return { ok: false, error: "WebSocket not connected." };
        }
        try {
            const response = await wsManager.executeScript({
                workflowId: activeWorkflow.id,
                enableNarration,
            });
            const errorMessage = typeof response.error === 'string' ? response.error : undefined;
            const logs = Array.isArray(response.logs) ? response.logs : [];
            const durationMs = typeof response.executionTime === 'number' ? response.executionTime * 1000 : undefined;
            return {
                ok: response.success,
                message: response.success
                    ? (durationMs ? `Completed in ${Math.round(durationMs)}ms` : "Script executed successfully")
                    : (errorMessage ?? "Script execution failed"),
                output: logs.length > 0 ? logs.join("\n") : null,
                error: response.success ? null : (errorMessage ?? "Script execution failed"),
                durationMs: durationMs ?? null,
                logs,
                raw: response
            };
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error ?? ''));
            const details = err.data;
            const logs = Array.isArray(details?.logs) ? details.logs : [];
            const errorText = typeof details?.error === 'string' && details.error.trim().length > 0 ? details.error : err.message;
            return {
                ok: false,
                error: errorText || 'Script execution failed',
                output: logs.length > 0 ? logs.join("\n") : null,
                logs: logs.length > 0 ? logs : undefined,
                raw: details ?? err
            };
        }
    }, [activeWorkflow?.id, wsStatus.connected, wsManager]);
    const handleAbortScript = useCallback(async () => {
        if (!activeWorkflow) {
            return { ok: false, error: "Workflow not selected." };
        }
        if (!wsStatus.connected) {
            return { ok: false, error: "WebSocket not connected." };
        }
        try {
            const response = await wsManager.abortScript(activeWorkflow.id);
            const aborted = Boolean(response?.aborted);
            const message = aborted
                ? response.wasRunning
                    ? "Workflow aborted."
                    : "No workflow was running."
                : "Failed to abort workflow.";
            return {
                ok: aborted,
                message,
                raw: response
            };
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error ?? ''));
            const details = err.data;
            const logs = Array.isArray(details?.logs) ? details.logs : [];
            const errorText = typeof details?.error === 'string' && details.error.trim().length > 0 ? details.error : err.message;
            return {
                ok: false,
                error: errorText || 'Failed to abort workflow',
                output: logs.length > 0 ? logs.join("\n") : null,
                logs: logs.length > 0 ? logs : undefined,
                raw: details ?? err
            };
        }
    }, [activeWorkflow?.id, wsStatus.connected, wsManager]);
    const connectionStatus = !wsStatus.connected || !wsStatus.hasOSClient ? "offline" : "online";
    const versionDescriptors = useMemo(() => {
        if (!activeWorkflow || !activeWorkflow.versions) {
            return [];
        }
        return activeWorkflow.versions.map((version) => ({
            id: version.id,
            name: version.name,
            createdAt: version.createdAtIso,
            isNamed: version.isNamed
        }));
    }, [activeWorkflow]);
    // Create observability config with connection status from WebSocket
    const observabilityConfig = useMemo(() => {
        if (!activeWorkflow) {
            return undefined;
        }
        console.log('App: Creating observability config with WebSocket status:', wsStatus);
        return {
            workflowId: activeWorkflow.id,
            baseUrl: WORKER_BASE_URL || '',
            apiKey: API_KEY,
            // Include connection status from WebSocket manager
            connectionStatus: {
                hasOSClient: wsStatus.hasOSClient,
                hasWebClient: wsStatus.hasWebClient,
            }
        };
    }, [activeWorkflow?.id, wsStatus.hasOSClient, wsStatus.hasWebClient]);
    const handleSaveVersion = useCallback(({ name, document, code }) => {
        if (!activeWorkflow) {
            return;
        }
        void saveWorkflowVersion({ workflowId: activeWorkflow.id, name, document, code });
    }, [activeWorkflow, saveWorkflowVersion]);
    const handleRestoreVersion = useCallback((versionId) => {
        if (!activeWorkflow) {
            return;
        }
        void restoreWorkflowVersion({ workflowId: activeWorkflow.id, versionId });
    }, [activeWorkflow, restoreWorkflowVersion]);
    const handleRenameVersion = useCallback(({ versionId, name }) => {
        if (!activeWorkflow) {
            return;
        }
        void renameWorkflowVersion({ workflowId: activeWorkflow.id, versionId, name });
    }, [activeWorkflow, renameWorkflowVersion]);
    const handleDeleteVersion = useCallback((versionId) => {
        if (!activeWorkflow) {
            return;
        }
        void deleteWorkflowVersion({ workflowId: activeWorkflow.id, versionId });
    }, [activeWorkflow, deleteWorkflowVersion]);
    const handleStartRecording = useCallback(async () => {
        if (!activeWorkflow) {
            setRecordingError("No workflow selected");
            return;
        }
        if (!wsStatus.connected) {
            setRecordingError("WebSocket not connected");
            return;
        }
        setRecordingBusy(true);
        setRecordingError(null);
        try {
            const response = await wsManager.startRecording(activeWorkflow.id);
            if (response.metadata?.recordingId) {
                setActiveRecordingId(response.metadata.recordingId);
                console.log("Recording started:", response.metadata);
                // Refresh recordings list
                void recordingsData.refreshRecordings();
            }
            else {
                setRecordingError("Failed to start recording: No recording ID received");
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to start recording";
            setRecordingError(errorMessage);
            console.error("Failed to start recording:", error);
        }
        finally {
            setRecordingBusy(false);
            void refreshActiveWorkflow();
        }
    }, [activeWorkflow?.id, wsStatus.connected, wsManager, recordingsData.refreshRecordings, refreshActiveWorkflow]);
    const handleStopRecording = useCallback(async (recordingId) => {
        if (!activeWorkflow) {
            setRecordingError("No workflow selected");
            return;
        }
        if (!wsStatus.connected) {
            setRecordingError("WebSocket not connected");
            return;
        }
        setRecordingBusy(true);
        setRecordingError(null);
        try {
            const response = await wsManager.stopRecording(activeWorkflow.id, recordingId);
            console.log("Recording stopped:", response.metadata);
            console.log("Recorded actions:", response.content.length);
            // Refresh recordings list
            void recordingsData.refreshRecordings();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to stop recording";
            setRecordingError(errorMessage);
            console.error("Failed to stop recording:", error);
        }
        finally {
            setRecordingBusy(false);
            setActiveRecordingId(null);
            void refreshActiveWorkflow();
        }
    }, [activeWorkflow?.id, wsStatus.connected, wsManager, recordingsData.refreshRecordings, refreshActiveWorkflow]);
    if (!activeWorkflow) {
        return _jsx(WorkflowList, {});
    }
    return (_jsx(WorkflowEditor, { document: activeWorkflow.document, code: activeWorkflow.code, onDocumentChange: handleDocumentChange, onCodeChange: handleCodeChange, onRunScript: handleRunScript, onAbortScript: handleAbortScript, onBack: clearActiveWorkflow, connectionStatus: connectionStatus, versioning: {
            versions: versionDescriptors,
            activeVersionId: activeWorkflow.lastRestoredVersionId,
            onSaveVersion: handleSaveVersion,
            onRestoreVersion: handleRestoreVersion,
            onRenameVersion: handleRenameVersion,
            onDeleteVersion: handleDeleteVersion
        }, observability: observabilityConfig, onStartRecording: handleStartRecording, onStopRecording: handleStopRecording, activeRecordingId: activeRecordingId, recordingError: recordingError, recordingBusy: recordingBusy, recordings: recordingsData.recordings, enableCommandPalette: true, enableUndoRedo: true, className: "h-screen w-screen" }));
};
export default App;
const useWorkspaceSynchronization = () => {
    const bootstrap = useWorkspaceStore((state) => state.bootstrap);
    useEffect(() => {
        void bootstrap();
    }, [bootstrap]);
};
