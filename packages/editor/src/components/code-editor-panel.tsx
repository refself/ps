import { useEffect, useMemo, useState } from "react";
import { Editor } from "@monaco-editor/react";

import { useEditorStore } from "../state/editor-store";
import { Icon } from "./icon";
import { editorTheme } from "../theme";
import { withAlpha } from "../utils/color";

type CodeEditorPanelProps = {
  variant?: "pane" | "full";
};

const CodeEditorPanel = ({ variant = "pane" }: CodeEditorPanelProps) => {
  const code = useEditorStore((state) => state.code);
  const loadWorkflowFromCode = useEditorStore((state) => state.loadWorkflowFromCode);
  const [draft, setDraft] = useState(code);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(code);
  }, [code]);

  const handleApply = () => {
    try {
      loadWorkflowFromCode(draft);
      setStatus("success");
      setMessage("Workflow updated from code.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setStatus("error");
      setMessage(detail);
    }
  };

  const handleReset = () => {
    setDraft(code);
    setStatus("idle");
    setMessage(null);
  };

  const statusStyles = useMemo(() => {
    switch (status) {
      case "success":
        return {
          borderColor: withAlpha(editorTheme.colors.positive, 0.6),
          background: withAlpha(editorTheme.colors.positive, 0.08),
          color: editorTheme.colors.positive,
        } as const;
      case "error":
        return {
          borderColor: withAlpha(editorTheme.colors.negative, 0.6),
          background: withAlpha(editorTheme.colors.negative, 0.08),
          color: editorTheme.colors.negative,
        } as const;
      default:
        return {
          borderColor: editorTheme.colors.borderSubtle,
          background: 'rgba(255,255,255,0.92)',
          color: editorTheme.colors.shaded,
        } as const;
    }
  }, [status]);

  const isFull = variant === "full";

  return (
    <section
      className="flex h-full flex-col overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.95)',
        borderBottom: isFull ? undefined : `1px solid ${editorTheme.colors.borderSubtle}`,
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          borderBottom: `1px solid ${editorTheme.colors.borderSubtle}`,
          padding: isFull ? '16px 24px' : '12px 16px',
        }}
      >
        <h2
          className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em]"
          style={{ color: editorTheme.colors.shaded }}
        >
          <Icon name="workflow" className="h-4 w-4" style={{ color: editorTheme.colors.action }} />
          Code
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition"
            style={{
              border: `1px solid ${editorTheme.colors.borderSubtle}`,
              background: 'rgba(255,255,255,0.95)',
              color: editorTheme.colors.shaded,
            }}
          >
            <Icon name="undo" className="h-3.5 w-3.5" title="Reset" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition"
            style={{
              border: `1px solid ${editorTheme.colors.action}`,
              background: editorTheme.colors.action,
              boxShadow: '0 8px 18px rgba(58,90,229,0.25)',
            }}
          >
            <Icon name="download" className="h-3.5 w-3.5" title="Apply" />
            Apply
          </button>
        </div>
      </div>

      {message ? (
        <div
          className={`${isFull ? "mx-6" : "mx-4"} mt-3 rounded-lg border px-3 py-2 text-xs`}
          style={statusStyles}
        >
          {message}
        </div>
      ) : null}

      <div className={`relative flex-1 overflow-hidden ${isFull ? "px-6 pb-6" : "px-4 pb-4"}`}>
        <Editor
          height="100%"
          theme="light"
          defaultLanguage="javascript"
          value={draft}
          onChange={(value) => setDraft(value ?? "")}
          onMount={(editor) => {
            // Prevent automatic formatting/escaping on paste
            editor.updateOptions({
              formatOnPaste: false,
              formatOnType: false,
              autoIndent: "none",
              useTabStops: false,
              insertSpaces: false,
              trimAutoWhitespace: false,
              wordWrap: "on",
              wrappingIndent: "none"
            });

            // Add custom paste handler to preserve original formatting
            editor.onDidPaste((e) => {
              // Let the paste complete normally, then get the pasted content
              setTimeout(() => {
                const currentValue = editor.getValue();
                // Only update if the content actually changed
                if (currentValue !== draft) {
                  setDraft(currentValue);
                }
              }, 10);
            });
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            smoothScrolling: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            // Additional options to preserve formatting
            formatOnPaste: false,
            formatOnType: false,
            autoIndent: "none",
            useTabStops: false,
            insertSpaces: false,
            trimAutoWhitespace: false,
            wordWrap: "on",
            wrappingIndent: "none",
            tabSize: 2,
            detectIndentation: false,
            renderWhitespace: "none",
            // Prevent auto-closing quotes/brackets
            autoClosingBrackets: "never",
            autoClosingQuotes: "never",
            autoSurround: "never"
          }}
        />
      </div>
    </section>
  );
};

export default CodeEditorPanel;
