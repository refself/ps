import { useEffect, useMemo, useState } from "react";

import { useEditorStore } from "../state/editor-store";
import { editorTheme } from "../theme";
import { withAlpha } from "../utils/color";
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
        accent: editorTheme.colors.positive,
        iconName: "check" as const,
        title: "Workflow Completed"
      };
    }
    if (executionStatus.state === "error") {
      return {
        accent: editorTheme.colors.negative,
        iconName: "alert" as const,
        title: "Workflow Failed"
      };
    }
    if (executionStatus.state === "aborted") {
      return {
        accent: editorTheme.colors.warning,
        iconName: "alert" as const,
        title: "Workflow Aborted"
      };
    }
    return {
      accent: editorTheme.colors.action,
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
  }`;

  const overlayStyle = {
    backgroundColor:
      executionStatus.state === "running" || executionStatus.state === "aborting"
        ? withAlpha(editorTheme.colors.foreground, 0.25)
        : withAlpha(editorTheme.colors.foreground, 0.35),
  };

  const panelClass = `relative w-full max-w-xl overflow-hidden rounded-2xl border shadow-[0_40px_80px_rgba(10,26,35,0.35)] transition-transform duration-200 ${
    isClosing ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
  }`;

  return (
    <div className={overlayClass} style={overlayStyle}>
      <div
        className={panelClass}
        style={{
          borderColor: editorTheme.colors.borderStrong,
          background: editorTheme.surfaces.card,
        }}
      >
        <div
          className="flex items-center gap-3 border-b px-6 py-4"
          style={{
            borderColor: editorTheme.colors.borderSubtle,
            background: editorTheme.surfaces.card,
          }}
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: withAlpha(accent, 0.1), color: accent }}
          >
            <Icon name={iconName} className="h-5 w-5" title={title} />
          </span>
          <div className="flex flex-col">
            <h3 className="text-base font-semibold" style={{ color: editorTheme.colors.foreground }}>
              {title}
            </h3>
            <span className="text-xs uppercase tracking-[0.3em]" style={{ color: editorTheme.colors.shaded }}>
              {executionStatus.timestamp ? new Date(executionStatus.timestamp).toLocaleString() : "Just now"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className={`ml-auto flex h-8 w-8 items-center justify-center rounded-full border transition ${
              canDismiss
                ? "hover:border-[var(--editor-color-action)] hover:text-[var(--editor-color-action)]"
                : "border-transparent"
            }`}
            aria-label="Close"
            disabled={!canDismiss}
            style={{
              borderColor: canDismiss ? editorTheme.colors.borderStrong : "transparent",
              color: canDismiss ? editorTheme.colors.shaded : editorTheme.colors.accentMuted,
              background: editorTheme.surfaces.card,
            }}
          >
            ×
          </button>
        </div>

        <div className="workflow-editor-scrollable space-y-4 px-6 py-5">
          {executionStatus.state === "running" || executionStatus.state === "aborting" ? (
            <div className="flex items-center gap-3 text-sm" style={{ color: editorTheme.colors.foreground }}>
              <span className="flex h-8 w-8 items-center justify-center">
                <span
                  className="h-6 w-6 animate-spin rounded-full border-2"
                  style={{
                    borderColor: withAlpha(editorTheme.colors.action, 0.2),
                    borderTopColor: editorTheme.colors.action,
                  }}
                />
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
                  className="rounded-full border px-3 py-1 text-xs font-semibold transition hover:bg-[var(--editor-color-negative-box)] disabled:cursor-not-allowed"
                  style={{
                    borderColor: editorTheme.colors.negative,
                    color: editorTheme.colors.negative,
                    backgroundColor: "transparent",
                  }}
                >
                  {executionStatus.state === "aborting" ? "Stopping…" : "Abort"}
                </button>
              ) : null}
            </div>
          ) : executionStatus.message ? (
            <p className="text-sm" style={{ color: editorTheme.colors.foreground }}>
              {executionStatus.message}
            </p>
          ) : null}
          {executionStatus.output && executionStatus.state !== "running" && executionStatus.state !== "aborting" ? (
            <div
              className="workflow-editor-scrollable rounded-xl border p-3"
              style={{
                borderColor: editorTheme.colors.borderSubtle,
                background: editorTheme.colors.backgroundSoft,
              }}
            >
              <div
                className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wide"
                style={{ color: editorTheme.colors.shaded }}
              >
                <span>Output</span>
              </div>
              <pre className="max-h-64 overflow-auto text-xs leading-5" style={{ color: editorTheme.colors.foreground }}>
                <code>{executionStatus.output}</code>
              </pre>
            </div>
          ) : null}
        </div>

        <div
          className="flex justify-end border-t px-6 py-3"
          style={{
            borderColor: editorTheme.colors.borderSubtle,
            background: editorTheme.colors.backgroundSoft,
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={!canDismiss}
            className="rounded-full border px-4 py-1.5 text-sm font-semibold transition"
            style={{
              borderColor: editorTheme.colors.borderStrong,
              background: editorTheme.colors.backgroundDefault,
              color: canDismiss ? editorTheme.colors.action : editorTheme.colors.accentMuted,
              opacity: canDismiss ? 1 : 0.75,
            }}
          >
            {canDismiss ? "Close" : executionStatus.state === "aborting" ? "Stopping" : "Running"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecutionResultOverlay;
