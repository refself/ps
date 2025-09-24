import { useCallback } from 'react';
import { useEditorStore } from '../state/editor-store';
import type { RunScriptHandler, RunScriptResult, AbortScriptHandler } from '../types/workflow-editor';

type UseExecutionOptions = {
  onRunScript?: RunScriptHandler;
  onAbortScript?: AbortScriptHandler;
  isRunnable: boolean;
};

export const useExecution = ({ onRunScript, onAbortScript, isRunnable }: UseExecutionOptions) => {
  const executionStatus = useEditorStore((state) => state.executionStatus);
  const setExecutionStatus = useEditorStore((state) => state.setExecutionStatus);
  const editorCode = useEditorStore((state) => state.code);
  const enableNarration = useEditorStore((state) => {
    const rootId = state.document.root;
    const rootBlock = state.document.blocks[rootId];
    const stored = (rootBlock?.data as Record<string, unknown> | undefined)?.enableNarration;
    return typeof stored === 'boolean' ? stored : true;
  });

  const runScript = useCallback(async () => {
    if (!onRunScript || !isRunnable) {
      return;
    }

    setExecutionStatus({
      state: "running",
      message: "Executing workflow…",
      output: null,
      timestamp: Date.now()
    });

    try {
      const result = await onRunScript({ code: editorCode, enableNarration });
      if (!result || typeof result !== "object" || !("ok" in result)) {
        setExecutionStatus({
          state: "success",
          message: "Workflow executed successfully.",
          output: null,
          timestamp: Date.now()
        });
        return;
      }

      const runResult = result as RunScriptResult;
      if (runResult.ok) {
        const successMessage =
          runResult.message ??
          (typeof runResult.durationMs === "number" ? `Completed in ${Math.round(runResult.durationMs)}ms` : "Workflow executed successfully.");

        setExecutionStatus({
          state: "success",
          message: successMessage,
          output: runResult.output ?? null,
          timestamp: Date.now()
        });
        return;
      }

      const errorMessage = runResult.error ?? runResult.message ?? "Workflow execution failed.";
      setExecutionStatus({
        state: "error",
        message: errorMessage,
        output: runResult.output ?? null,
        timestamp: Date.now()
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to execute workflow.";
      setExecutionStatus({
        state: "error",
        message,
        output: null,
        timestamp: Date.now()
      });
    }
  }, [editorCode, onRunScript, setExecutionStatus, isRunnable]);

  const abortScript = useCallback(async () => {
    if (!onAbortScript) {
      return;
    }

    const currentState = useEditorStore.getState().executionStatus.state;
    if (currentState !== "running" && currentState !== "aborting") {
      return;
    }

    const previousStatus = useEditorStore.getState().executionStatus;
    setExecutionStatus({
      state: "aborting",
      message: "Stopping workflow…",
      output: previousStatus.output,
      timestamp: Date.now()
    });

    try {
      const result = await onAbortScript();
      const defaultSuccess = {
        ok: true,
        message: "Workflow aborted.",
        output: null
      } satisfies RunScriptResult;

      const abortResult = result && typeof result === "object" && "ok" in result
        ? (result as RunScriptResult)
        : defaultSuccess;

      if (abortResult.ok) {
        setExecutionStatus({
          state: "aborted",
          message: abortResult.message ?? "Workflow aborted.",
          output: abortResult.output ?? null,
          timestamp: Date.now()
        });
      } else {
        const errorMessage = abortResult.error ?? abortResult.message ?? "Failed to abort workflow.";
        setExecutionStatus({
          state: "error",
          message: errorMessage,
          output: abortResult.output ?? null,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to abort workflow.";
      setExecutionStatus({
        state: "error",
        message,
        output: null,
        timestamp: Date.now()
      });
    }
  }, [onAbortScript, setExecutionStatus]);

  const canAbortScript = Boolean(onAbortScript) && (executionStatus.state === "running" || executionStatus.state === "aborting");

  return {
    executionStatus,
    runScript,
    abortScript,
    canAbortScript,
  };
};
