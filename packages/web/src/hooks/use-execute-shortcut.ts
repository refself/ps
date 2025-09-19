import { useEffect } from "react";

import { useEditorStore } from "../state/editor-store";

const HOTKEYS = [
  { metaKey: true, key: "Enter" },
  { ctrlKey: true, key: "Enter" }
];

export const useExecuteShortcut = () => {
  const code = useEditorStore((state) => state.code);
  const executionStatus = useEditorStore((state) => state.executionStatus);
  const setExecutionStatus = useEditorStore((state) => state.setExecutionStatus);

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (executionStatus.state === "running") {
        return;
      }

      const matchesHotkey = HOTKEYS.some((combo) => {
        if (combo.metaKey && !event.metaKey) {
          return false;
        }
        if (combo.ctrlKey && !event.ctrlKey) {
          return false;
        }
        return event.key === combo.key;
      });

      if (!matchesHotkey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const trimmed = code?.trim();
      if (!trimmed) {
        setExecutionStatus({
          state: "error",
          message: "No workflow code available to execute.",
          output: null,
          timestamp: Date.now()
        });
        return;
      }

      const { executeWorkflowScript } = await import("../services/execute-script-service");

      setExecutionStatus({
        state: "running",
        message: "Executing workflow script…",
        output: null,
        timestamp: Date.now()
      });

      try {
        const data = await executeWorkflowScript(trimmed);
        if (data.ok) {
          setExecutionStatus({
            state: "success",
            message: data.output ? "Script executed successfully." : "Script completed.",
            output: typeof data.output === "string" ? data.output : data.output ?? null,
            timestamp: Date.now()
          });
        } else {
          setExecutionStatus({
            state: "error",
            message: data.error ?? "Failed to execute script.",
            output: typeof data.output === "string" ? data.output : null,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        setExecutionStatus({
          state: "error",
          message: error instanceof Error ? error.message : "Unexpected error while executing script.",
          output: null,
          timestamp: Date.now()
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [code, executionStatus.state, setExecutionStatus]);
};

export default useExecuteShortcut;
