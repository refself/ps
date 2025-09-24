import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Editor } from "@monaco-editor/react";
import { useEditorStore } from "../state/editor-store";
import { Icon } from "./icon";
const CodeEditorPanel = ({ variant = "pane" }) => {
    const code = useEditorStore((state) => state.code);
    const loadWorkflowFromCode = useEditorStore((state) => state.loadWorkflowFromCode);
    const [draft, setDraft] = useState(code);
    const [status, setStatus] = useState("idle");
    const [message, setMessage] = useState(null);
    useEffect(() => {
        setDraft(code);
    }, [code]);
    const handleApply = () => {
        try {
            loadWorkflowFromCode(draft);
            setStatus("success");
            setMessage("Workflow updated from code.");
        }
        catch (error) {
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
                return "border-[#32AA81] bg-[#32AA8110] text-[#267E61]";
            case "error":
                return "border-[#CD3A50] bg-[#CD3A5010] text-[#CD3A50]";
            default:
                return "border-[#0A1A2314] bg-white text-[#657782]";
        }
    }, [status]);
    const isFull = variant === "full";
    return (_jsxs("section", { className: isFull
            ? "flex h-full flex-col overflow-hidden bg-white/95"
            : "flex h-full flex-1 flex-col overflow-hidden border-b border-[#0A1A2314] bg-white", children: [_jsxs("div", { className: `flex items-center justify-between ${isFull ? "border-b border-[#0A1A2314] px-6 py-4" : "border-b border-[#0A1A2314] px-4 py-3"}`, children: [_jsxs("h2", { className: "flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-[#657782]", children: [_jsx(Icon, { name: "workflow", className: "h-4 w-4 text-[#3A5AE5]" }), "Code"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { type: "button", onClick: handleReset, className: "flex items-center gap-2 rounded-full border border-[#0A1A2333] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#657782] transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]", children: [_jsx(Icon, { name: "undo", className: "h-3.5 w-3.5", title: "Reset" }), "Reset"] }), _jsxs("button", { type: "button", onClick: handleApply, className: "flex items-center gap-2 rounded-full border border-[#3A5AE5] bg-[#3A5AE5] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_8px_18px_rgba(58,90,229,0.25)] transition hover:shadow-[0_10px_22px_rgba(58,90,229,0.35)]", children: [_jsx(Icon, { name: "download", className: "h-3.5 w-3.5", title: "Apply" }), "Apply"] })] })] }), message ? (_jsx("div", { className: `${isFull ? "mx-6" : "mx-4"} mt-3 rounded-lg border px-3 py-2 text-xs ${statusStyles}`, children: message })) : null, _jsx("div", { className: `relative flex-1 overflow-hidden ${isFull ? "px-6 pb-6" : "px-4 pb-4"}`, children: _jsx(Editor, { height: "100%", theme: "light", defaultLanguage: "javascript", value: draft, onChange: (value) => setDraft(value ?? ""), onMount: (editor) => {
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
                    }, options: {
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
                    } }) })] }));
};
export default CodeEditorPanel;
