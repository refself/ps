import { ChangeEvent, FormEvent, useRef, useState } from "react";

import { useEditorStore } from "../state/editor-store";

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
  const code = useEditorStore((state) => state.code);
  const renameDocument = useEditorStore((state) => state.renameDocument);
  const loadWorkflowFromCode = useEditorStore((state) => state.loadWorkflowFromCode);
  const createBlankWorkflow = useEditorStore((state) => state.createBlankWorkflow);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const duplicateSelected = useEditorStore((state) => state.duplicateBlock);
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDemo, setSelectedDemo] = useState<string>("");
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

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
    const formData = new FormData(event.currentTarget);
    const name = (formData.get("documentName") as string) ?? "Untitled Workflow";
    renameDocument(name);
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

  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          name="documentName"
          defaultValue={documentName}
          className="w-64 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-blue-500 hover:text-blue-200"
        >
          Rename
        </button>
      </form>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => createBlankWorkflow()}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-blue-500 hover:text-blue-200"
        >
          New
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
