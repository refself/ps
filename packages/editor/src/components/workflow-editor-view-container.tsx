import BlockLibraryPanel from './block-library-panel';
import EditorCanvas from './editor-canvas';
import InspectorPanel from './inspector-panel';
import CodeEditorPanel from './code-editor-panel';
import { ObservabilityPanel } from './observability-panel';
import type { EditorMode, ObservabilityConfig } from '../types/workflow-editor';
import type { ObservabilityRecording, ObservabilityToolRequest } from '../hooks/use-observability';

type WorkflowEditorViewContainerProps = {
  mode: EditorMode;
  observabilityConfig?: ObservabilityConfig;
  observabilityState: {
    recordings: ObservabilityRecording[];
    toolRequests: ObservabilityToolRequest[];
    status: "idle" | "loading" | "ready" | "error";
    error?: string;
    connection?: {
      hasOSClient: boolean;
      hasWebClient: boolean;
    };
  };
  onStartRecording?: () => void;
  onStopRecording?: (recordingId: string) => void;
  recordingBusy: boolean;
  activeRecordingId?: string | null;
  recordingError?: string | null;
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

const WorkflowEditorViewContainer = ({
  mode,
  observabilityConfig,
  observabilityState,
  onStartRecording,
  onStopRecording,
  recordingBusy,
  activeRecordingId,
  recordingError,
  recordings,
}: WorkflowEditorViewContainerProps) => {
  const renderVisualView = () => (
    <div className="workflow-editor-scrollable flex flex-1 overflow-hidden">
      <BlockLibraryPanel />
      <EditorCanvas />
      <div className="flex w-[420px] flex-col overflow-hidden border-l border-[#0A1A2314] bg-white/80 backdrop-blur">
        <InspectorPanel />
      </div>
    </div>
  );

  const renderCodeView = () => (
    <div className="workflow-editor-scrollable flex flex-1 overflow-hidden px-10 py-8">
      <div className="workflow-editor-scrollable flex w-full flex-col overflow-hidden rounded-2xl border border-[#0A1A2314] bg-white shadow-[0_30px_60px_rgba(10,26,35,0.15)]">
        <CodeEditorPanel variant="full" />
      </div>
    </div>
  );

  const renderRecordingsView = () => (
    <div className="workflow-editor-scrollable flex flex-1 overflow-hidden px-10 py-8">
      <div className="workflow-editor-scrollable flex w-full flex-col overflow-hidden rounded-2xl border border-[#0A1A2314] bg-white shadow-[0_30px_60px_rgba(10,26,35,0.15)]">
        {observabilityConfig ? (
          <ObservabilityPanel
            recordings={recordings || []}
            toolRequests={observabilityState.toolRequests}
            status={observabilityState.status}
            error={observabilityState.error}
            connection={observabilityState.connection}
            onStartRecording={onStartRecording}
            onStopRecording={onStopRecording}
            recordingBusy={recordingBusy}
            activeRecordingId={activeRecordingId}
            variant="full"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-12">
            <div className="flex max-w-md flex-col items-center gap-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EEF2FF]">
                <svg className="h-8 w-8 text-[#3A5AE5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-[#0A1A23]">Recordings Unavailable</h3>
                <p className="text-sm text-[#657782]">
                  Connect an OS client to enable workflow recordings and observability features.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#657782]">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#CD3A50]" />
                  <span>OS Client Required</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#32AA81]" />
                  <span>Real-time Monitoring</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderPrimaryView = () => {
    if (mode === "code") {
      return renderCodeView();
    }
    if (mode === "recordings") {
      return renderRecordingsView();
    }
    return renderVisualView();
  };

  return renderPrimaryView();
};

export default WorkflowEditorViewContainer;
