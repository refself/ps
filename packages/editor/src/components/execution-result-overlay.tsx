import { useEffect, useMemo, useState } from "react";

import { useEditorStore } from "../state/editor-store";
import { Icon } from "./icon";

const CLOSE_DELAY = 200;

type ExecutionResultOverlayProps = {
  onAbortScript?: () => void;
  canAbortScript?: boolean;
};

const ExecutionResultOverlay = ({ onAbortScript, canAbortScript = false }: ExecutionResultOverlayProps) => {
  const executionStatus = useEditorStore((state) => state.executionStatus);
  const [isMounted, setIsMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [seenTimestamp, setSeenTimestamp] = useState<number | null>(null);

  const isTerminal =
    executionStatus.state === "success" ||
    executionStatus.state === "error" ||
    executionStatus.state === "aborted";

  useEffect(() => {
    if (executionStatus.state === "running" || executionStatus.state === "aborting") {
      setIsMounted(true);
      setIsClosing(false);
      setSeenTimestamp(null);
      return;
    }

    if (isTerminal) {
      const currentTimestamp = executionStatus.timestamp ?? Date.now();
      if (seenTimestamp !== currentTimestamp) {
        setSeenTimestamp(currentTimestamp);
        setIsMounted(true);
        setIsClosing(false);
      }
      return;
    }

    setIsMounted(false);
    setIsClosing(false);
  }, [executionStatus.state, executionStatus.timestamp, isTerminal, seenTimestamp]);

  const canDismiss = isTerminal;

  const { accent, iconName, title } = useMemo(() => {
    if (executionStatus.state === "success") {
      return {
        accent: "#32AA81",
        iconName: "check" as const,
        title: "Workflow Completed"
      };
    }
    if (executionStatus.state === "error") {
      return {
        accent: "#CD3A50",
        iconName: "alert" as const,
        title: "Workflow Failed"
      };
    }
    if (executionStatus.state === "aborted") {
      return {
        accent: "#F59E0B",
        iconName: "alert" as const,
        title: "Workflow Aborted"
      };
    }
    return {
      accent: "#3A5AE5",
      iconName: "workflow" as const,
      title: "Executing Workflow"
    };
  }, [executionStatus.state]);

  const handleClose = () => {
    if (!canDismiss) {
      return;
    }
    setIsClosing(true);
    setTimeout(() => {
      setIsMounted(false);
      setIsClosing(false);
    }, CLOSE_DELAY);
  };

  const handleAbort = () => {
    if (executionStatus.state !== "running" || !onAbortScript || !canAbortScript) {
      return;
    }
    onAbortScript();
  };

  if (!isMounted) {
    return null;
  }

  const overlayClass = `pointer-events-auto fixed inset-0 z-50 flex items-center justify-center px-4 py-8 backdrop-blur-sm transition-opacity duration-200 ${
    isClosing ? "opacity-0" : "opacity-100"
  } ${
    executionStatus.state === "running" || executionStatus.state === "aborting"
      ? "bg-[rgba(10,26,35,0.25)]"
      : "bg-[rgba(10,26,35,0.35)]"
  }`;

  const panelClass = `relative w-full max-w-xl overflow-hidden rounded-2xl border border-[#0A1A2333] bg-white shadow-[0_40px_80px_rgba(10,26,35,0.35)] transition-transform duration-200 ${
    isClosing ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
  }`;

  return (
    <div className={overlayClass}>
      <div className={panelClass}>
        <div className="flex items-center gap-3 border-b border-[#0A1A2314] bg-white px-6 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1a`, color: accent }}>
            <Icon name={iconName} className="h-5 w-5" title={title} />
          </span>
          <div className="flex flex-col">
            <h3 className="text-base font-semibold text-[#0A1A23]">{title}</h3>
            <span className="text-xs uppercase tracking-[0.3em] text-[#657782]">
              {executionStatus.timestamp ? new Date(executionStatus.timestamp).toLocaleString() : "Just now"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className={`ml-auto flex h-8 w-8 items-center justify-center rounded-full border transition ${
              canDismiss
                ? "border-[#0A1A2333] text-[#657782] hover:border-[#3A5AE5] hover:text-[#3A5AE5]"
                : "border-transparent text-[#9AA7B4]"
            }`}
            aria-label="Close"
            disabled={!canDismiss}
          >
            ×
          </button>
        </div>

        <div className="workflow-editor-scrollable space-y-4 px-6 py-5">
          {executionStatus.state === "running" || executionStatus.state === "aborting" ? (
            <div className="flex items-center gap-3 text-sm text-[#0A1A23]">
              <span className="flex h-8 w-8 items-center justify-center">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#3A5AE533] border-t-[#3A5AE5]" />
              </span>
              <span className="flex-1">
                {executionStatus.message ??
                  (executionStatus.state === "aborting" ? "Stopping workflow…" : "Executing workflow…")}
              </span>
              {onAbortScript ? (
                <button
                  type="button"
                  onClick={handleAbort}
                  disabled={!canAbortScript || executionStatus.state === "aborting"}
                  className="rounded-full border border-[#CD3A50] px-3 py-1 text-xs font-semibold text-[#CD3A50] transition hover:bg-[#CD3A5010] disabled:cursor-not-allowed disabled:border-[#9AA7B4] disabled:text-[#9AA7B4]"
                >
                  {executionStatus.state === "aborting" ? "Stopping…" : "Abort"}
                </button>
              ) : null}
            </div>
          ) : executionStatus.message ? (
            <p className="text-sm text-[#0A1A23]">{executionStatus.message}</p>
          ) : null}
          {executionStatus.output && executionStatus.state !== "running" && executionStatus.state !== "aborting" ? (
            <div className="workflow-editor-scrollable rounded-xl border border-[#0A1A2314] bg-[#F5F6F9] p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-[#657782]">
                <span>Output</span>
              </div>
              <pre className="max-h-64 overflow-auto text-xs leading-5 text-[#0A1A23]">
                <code>{executionStatus.output}</code>
              </pre>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end border-t border-[#0A1A2314] bg-[#F5F6F9] px-6 py-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={!canDismiss}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              canDismiss
                ? "border-[#0A1A2333] bg-white text-[#3A5AE5] hover:border-[#3A5AE5] hover:bg-[#3A5AE510]"
                : "border-[#0A1A2314] bg-white text-[#9AA7B4]"
            }`}
          >
            {canDismiss ? "Close" : executionStatus.state === "aborting" ? "Stopping" : "Running"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecutionResultOverlay;
