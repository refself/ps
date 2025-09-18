import { useState } from "react";

import { useEditorStore } from "../state/editor-store";

const CodePreviewPanel = () => {
  const code = useEditorStore((state) => state.code);
  const lastError = useEditorStore((state) => state.lastError);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const handleCopy = async () => {
    if (!code) {
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch (error) {
      console.error("Failed to copy code", error);
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  return (
    <section className="flex h-1/2 flex-col overflow-hidden border-t border-slate-800 bg-slate-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Code</h2>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-blue-500 hover:text-blue-200"
        >
          {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy Failed" : "Copy"}
        </button>
      </div>
      {lastError ? (
        <div className="mb-3 rounded border border-red-500 bg-red-950/30 p-3 text-xs text-red-300">
          {lastError}
        </div>
      ) : null}
      <pre className="flex-1 overflow-auto rounded border border-slate-800 bg-slate-900 p-4 text-xs leading-5 text-slate-200">
        <code>{code || "// Code preview will appear here"}</code>
      </pre>
    </section>
  );
};

export { CodePreviewPanel };
export default CodePreviewPanel;
