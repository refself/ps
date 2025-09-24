import { useCallback } from 'react';
import { useEditorStore } from '../state/editor-store';

type RunScriptResult = {
  ok: boolean;
  message?: string | null;
  output?: string | null;
  error?: string | null;
  durationMs?: number | null;
  logs?: string[] | null;
  raw?: unknown;
};

type RunScriptHandler = (code: string) => Promise<RunScriptResult | void> | RunScriptResult | void;

type UseExecutionOptions = {
  onRunScript?: RunScriptHandler;
  isRunnable: boolean;
};

export const useExecution = ({ onRunScript, isRunnable }: UseExecutionOptions) => {
  const executionStatus = useEditorStore((state) => state.executionStatus);
  const setExecutionStatus = useEditorStore((state) => state.setExecutionStatus);
  const editorCode = useEditorStore((state) => state.code);

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
      const result = await onRunScript(editorCode);
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

  return {
    executionStatus,
    runScript,
  };
};
