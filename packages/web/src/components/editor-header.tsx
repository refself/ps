import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

import { executeWorkflowScript } from "../services/execute-script-service";
import { useEditorStore } from "../state/editor-store";
import { useWorkspaceStore } from "../state/workspace-store";

type DemoOption = {
  file: string;
  label: string;
};

const DEMOS: DemoOption[] = [
  { file: "invoice-categorization.rf", label: "Invoice Categorization" },
  { file: "job-hunt.rf", label: "Job Hunt" },
  { file: "talent-search.rf", label: "Talent Search" }
];

const EditorHeader = () => {
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

  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearActiveWorkflow}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-blue-500 hover:text-blue-200"
          >
            Back to Workflows
          </button>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Workflow</span>
          <select
            value={activeWorkflowId ?? ""}
            onChange={handleWorkflowChange}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-blue-500"
          >
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.document.metadata.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCreateWorkflow}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-emerald-500 hover:text-emerald-200"
          >
            New
          </button>
          <button
            type="button"
            onClick={handleDeleteWorkflow}
            disabled={!activeWorkflowId || workflows.length <= 1}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-red-500 hover:text-red-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
          >
            Delete
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={nameInputRef}
            name="documentName"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            className="w-64 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-blue-500 hover:text-blue-200"
          >
            Rename
          </button>
        </form>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExecuteScript}
          disabled={executionStatus.state === "running"}
          className="rounded border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-emerald-900 disabled:text-emerald-700"
        >
          {executionStatus.state === "running" ? "Running…" : "Execute Script"}
        </button>
        <button
          type="button"
          disabled={!selectedBlockId}
          onClick={() => selectedBlockId && duplicateSelected(selectedBlockId)}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-emerald-500 hover:text-emerald-300 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
        >
          Duplicate Block
        </button>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <span>Demos</span>
          <select
            value={selectedDemo}
            onChange={handleDemoSelect}
            disabled={isLoadingDemo}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-blue-500"
          >
            <option value="">Select…</option>
            {DEMOS.map((demo) => (
              <option key={demo.file} value={demo.file}>
                {demo.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={triggerFilePicker}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-blue-500 hover:text-blue-200"
        >
          Import
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-blue-500 hover:text-blue-200"
        >
          Export
        </button>
        <button
          type="button"
          onClick={undo}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-blue-500 hover:text-blue-200"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={redo}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-blue-500 hover:text-blue-200"
        >
          Redo
        </button>
        <span className="ml-3 hidden text-[11px] text-slate-500 lg:block">Alt+drag to pan • Ctrl/⌘+scroll to zoom</span>
        <input ref={fileInputRef} type="file" accept=".rf" className="hidden" onChange={handleFileChange} />
      </div>
    </header>
  );
};

export { EditorHeader };
