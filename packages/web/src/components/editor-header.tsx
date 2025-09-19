import { type ChangeEvent, type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";

import { executeWorkflowScript } from "../services/execute-script-service";
import { useEditorStore } from "../state/editor-store";
import { useWorkspaceStore } from "../state/workspace-store";
import { Icon, type IconName } from "./icon";

type DemoOption = {
  file: string;
  label: string;
};

const DEMOS: DemoOption[] = [
  { file: "invoice-categorization.rf", label: "Invoice Categorization" },
  { file: "job-hunt.rf", label: "Job Hunt" },
  { file: "talent-search.rf", label: "Talent Search" }
];

type EditorHeaderProps = {
  viewMode: "visual" | "code";
  onViewModeChange: (mode: "visual" | "code") => void;
};

const EditorHeader = ({ viewMode, onViewModeChange }: EditorHeaderProps) => {
  const documentName = useEditorStore((state) => state.document.metadata.name);
  const renameDocument = useEditorStore((state) => state.renameDocument);
  const loadWorkflowFromCode = useEditorStore((state) => state.loadWorkflowFromCode);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const duplicateSelected = useEditorStore((state) => state.duplicateBlock);
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
  const code = useEditorStore((state) => state.code);
  const executionStatus = useEditorStore((state) => state.executionStatus);
  const setExecutionStatus = useEditorStore((state) => state.setExecutionStatus);

  const clearActiveWorkflow = useWorkspaceStore((state) => state.clearActiveWorkflow);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [selectedDemo, setSelectedDemo] = useState("");
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [nameDraft, setNameDraft] = useState(documentName);
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    setNameDraft(documentName);
  }, [documentName]);

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    loadWorkflowFromCode(text);
    const cleanName = file.name.replace(/\.rf$/i, "");
    if (cleanName) {
      renameDocument(cleanName);
    }
    event.target.value = "";
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const formData = new FormData(event.currentTarget);
    const name = ((formData.get("documentName") as string) ?? "Untitled Workflow").trim();
    renameDocument(name.length > 0 ? name : "Untitled Workflow");
    setIsEditingName(false);
  };

  const commitNameDraft = () => {
    const trimmed = nameDraft.trim();
    renameDocument(trimmed.length > 0 ? trimmed : "Untitled Workflow");
  };

  const handleNameBlur = () => {
    if (!isEditingName) {
      return;
    }
    commitNameDraft();
    setIsEditingName(false);
  };

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsEditingName(false);
      setNameDraft(documentName);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      commitNameDraft();
      setIsEditingName(false);
    }
  };

  const startEditingName = () => {
    setNameDraft(documentName);
    setIsEditingName(true);
    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
  };

  const handleExport = () => {
    if (!code) {
      return;
    }

    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const filename = `${documentName || "workflow"}.rf`;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDemoSelect = async (event: ChangeEvent<HTMLSelectElement>) => {
    const file = event.target.value;
    setSelectedDemo(file);
    if (!file) {
      return;
    }

    try {
      setIsLoadingDemo(true);
      const response = await fetch(`/demos/${file}`);
      if (!response.ok) {
        throw new Error(`Failed to load demo ${file}`);
      }
      const text = await response.text();
      loadWorkflowFromCode(text);
      const cleanName = file.replace(/\.rf$/i, "");
      renameDocument(cleanName);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingDemo(false);
      setSelectedDemo("");
    }
  };

  const handleExecuteScript = async () => {
    if (!code || code.trim().length === 0) {
      setExecutionStatus({
        state: "error",
        message: "No workflow code available to execute.",
        output: null,
        timestamp: Date.now()
      });
      return;
    }

    setExecutionStatus({
      state: "running",
      message: "Executing workflow script…",
      output: null,
      timestamp: Date.now()
    });

    try {
      const data = await executeWorkflowScript(code);

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

  const IconButton = ({
    label,
    icon,
    onClick,
    disabled
  }: {
    label: string;
    icon: IconName;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#CED6E9] bg-white text-[#0A1A23] shadow-sm transition hover:border-[#3A5AE5] hover:shadow-[0_8px_20px_rgba(58,90,229,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
      title={label}
      aria-label={label}
    >
      <Icon name={icon} title={label} className="h-4 w-4" />
    </button>
  );

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-[#D8DEEE] bg-white px-10 py-4">
      <div className="flex items-center gap-3">
        <IconButton label="Back to workflows" icon="back" onClick={clearActiveWorkflow} />
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.3em] text-[#9AA7B4]">Workflow</span>
          {isEditingName ? (
            <form onSubmit={handleSubmit} className="mt-1 flex items-center gap-2">
              <input
                ref={nameInputRef}
                name="documentName"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
                className="w-64 rounded border border-[#CED6E9] bg-white px-3 py-1.5 text-sm text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
              />
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#CED6E9] bg-white text-[#0A1A23] shadow-sm transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]"
                aria-label="Save name"
                title="Save name"
              >
                <Icon name="check" className="h-3.5 w-3.5" title="Save name" />
              </button>
            </form>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[#0A1A23]">{documentName}</h1>
              <button
                type="button"
                onClick={startEditingName}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#CED6E9] bg-white text-[#0A1A23] shadow-sm transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]"
                aria-label="Rename workflow"
                title="Rename workflow"
              >
                <Icon name="rename" className="h-3.5 w-3.5" title="Rename" />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center">
        <div className="flex items-center rounded-full border border-[#CED6E9] bg-[#F5F6FB] p-1 text-sm font-medium text-[#0A1A23]">
          <button
            type="button"
            onClick={() => onViewModeChange("visual")}
            className={`rounded-full px-4 py-1 transition ${
              viewMode === "visual" ? "bg-white text-[#3A5AE5] shadow" : "text-[#657782]"
            }`}
            aria-pressed={viewMode === "visual"}
          >
            Canvas
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("code")}
            className={`rounded-full px-4 py-1 transition ${
              viewMode === "code" ? "bg-white text-[#3A5AE5] shadow" : "text-[#657782]"
            }`}
            aria-pressed={viewMode === "code"}
          >
            Code
          </button>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 text-[#0A1A23]">
        {viewMode === "visual" ? (
          <>
            <IconButton
              label={executionStatus.state === "running" ? "Running" : "Run script"}
              icon="play"
              onClick={handleExecuteScript}
              disabled={executionStatus.state === "running"}
            />
            <IconButton
              label="Duplicate block"
              icon="copy"
              onClick={() => selectedBlockId && duplicateSelected(selectedBlockId)}
              disabled={!selectedBlockId}
            />
            <IconButton label="Import workflow" icon="upload" onClick={triggerFilePicker} />
            <IconButton label="Export workflow" icon="download" onClick={handleExport} />
            <IconButton label="Undo" icon="undo" onClick={undo} />
            <IconButton label="Redo" icon="redo" onClick={redo} />
            <select
              value={selectedDemo}
              onChange={handleDemoSelect}
              disabled={isLoadingDemo}
              className="rounded-full border border-[#0A1A2333] bg-white px-3 py-1 text-xs text-[#657782] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
              title="Load demo"
            >
              <option value="">Demo</option>
              {DEMOS.map((demo) => (
                <option key={demo.file} value={demo.file}>
                  {demo.label}
                </option>
              ))}
            </select>
            <span className="ml-3 hidden text-[11px] text-[#9AA7B4] lg:block">Alt+drag to pan • Ctrl/⌘+scroll</span>
            <input ref={fileInputRef} type="file" accept=".rf" className="hidden" onChange={handleFileChange} />
          </>
        ) : (
          <IconButton
            label={executionStatus.state === "running" ? "Running" : "Run script"}
            icon="play"
            onClick={handleExecuteScript}
            disabled={executionStatus.state === "running"}
          />
        )}
      </div>
    </header>
  );
};

export { EditorHeader };
