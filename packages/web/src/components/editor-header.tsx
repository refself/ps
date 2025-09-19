import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

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

  const workflows = useWorkspaceStore((state) => state.workflows);
  const activeWorkflowId = useWorkspaceStore((state) => state.activeWorkflowId);
  const createWorkflow = useWorkspaceStore((state) => state.createWorkflow);
  const selectWorkflow = useWorkspaceStore((state) => state.selectWorkflow);
  const deleteWorkflow = useWorkspaceStore((state) => state.deleteWorkflow);
  const clearActiveWorkflow = useWorkspaceStore((state) => state.clearActiveWorkflow);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [selectedDemo, setSelectedDemo] = useState("");
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [nameDraft, setNameDraft] = useState(documentName);

  useEffect(() => {
    setNameDraft(documentName);
  }, [documentName]);

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleWorkflowChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const workflowId = event.target.value;
    if (!workflowId) {
      return;
    }
    selectWorkflow({ id: workflowId });
  };

  const handleCreateWorkflow = () => {
    const nextIndex = workflows.length + 1;
    const workflowName = `Workflow ${nextIndex}`;
    createWorkflow({ name: workflowName });
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
  };

  const handleDeleteWorkflow = () => {
    if (!activeWorkflowId) {
      return;
    }
    deleteWorkflow({ id: activeWorkflowId });
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
    const formData = new FormData(event.currentTarget);
    const name = ((formData.get("documentName") as string) ?? "Untitled Workflow").trim();
    renameDocument(name.length > 0 ? name : "Untitled Workflow");
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
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-transparent bg-white/40 text-[#0A1A23] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition hover:shadow-[0_10px_30px_rgba(58,90,229,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
      title={label}
      aria-label={label}
    >
      <span className="absolute inset-0 rounded-full bg-gradient-to-br from-white/60 via-white/20 to-white/0" />
      <Icon name={icon} title={label} className="relative h-4 w-4" />
    </button>
  );

  const toggleView = () => {
    onViewModeChange(viewMode === "code" ? "visual" : "code");
  };

  return (
    <header className="relative flex items-center justify-between overflow-hidden border-b border-[#0A1A2314] bg-white/60 px-10 py-4 backdrop-blur-2xl">
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-transparent" />
      <span className="absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#3A5AE566] to-transparent" />
      <div className="flex items-center gap-4">
        <IconButton label="Back to workflows" icon="back" onClick={clearActiveWorkflow} />
        <div className="flex items-center gap-3 rounded-full border border-[#0A1A2333] bg-white px-4 py-2 shadow-sm">
          <span className="text-sm font-semibold text-[#0A1A23]">{documentName}</span>
          <select
            value={activeWorkflowId ?? ""}
            onChange={handleWorkflowChange}
            className="rounded-full border border-transparent bg-transparent px-2 py-1 text-sm text-[#657782] outline-none focus:border-[#3A5AE5]"
          >
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.document.metadata.name}
              </option>
            ))}
          </select>
          <IconButton label="New workflow" icon="plus" onClick={handleCreateWorkflow} />
          <IconButton
            label="Delete workflow"
            icon="trash"
            onClick={handleDeleteWorkflow}
            disabled={!activeWorkflowId || workflows.length <= 1}
          />
          <IconButton
            label={viewMode === "code" ? "Visual mode" : "Code mode"}
            icon={viewMode === "code" ? "workflow" : "expression"}
            onClick={toggleView}
          />
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={nameInputRef}
            name="documentName"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            className="w-64 rounded border border-[#0A1A2333] bg-white px-3 py-2 text-sm text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
          />
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#0A1A2333] bg-white text-[#0A1A23] shadow-sm transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]"
            aria-label="Save name"
            title="Save name"
          >
            <Icon name="rename" className="h-4 w-4" title="Save name" />
          </button>
        </form>
      </div>
      <div className="flex items-center gap-2 text-[#0A1A23]">
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
