import { useMemo, useState } from "react";

import { useWorkspaceStore } from "../state/workspace-store";

const WorkflowList = () => {
  const workflows = useWorkspaceStore((state) => state.workflows);
  const selectWorkflow = useWorkspaceStore((state) => state.selectWorkflow);
  const createWorkflow = useWorkspaceStore((state) => state.createWorkflow);
  const deleteWorkflow = useWorkspaceStore((state) => state.deleteWorkflow);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const formattedWorkflows = useMemo(
    () =>
      workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.document.metadata.name,
        updatedAt: workflow.updatedAt,
        description: workflow.document.metadata.description ?? ""
      })),
    [workflows]
  );

  const formatter = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }), []);

  const handleCreateWorkflow = () => {
    const index = workflows.length + 1;
    const name = `Workflow ${index}`;
    createWorkflow({ name });
  };

  const handleDelete = (id: string) => {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    deleteWorkflow({ id });
    setPendingDeleteId(null);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-8 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-50">Workflows</h1>
          <p className="text-sm text-slate-400">Choose a workflow to open it in the editor.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateWorkflow}
            className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:border-blue-400 hover:bg-blue-500/20"
          >
            New Workflow
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-8 py-10">
        {formattedWorkflows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-400">
            <p>No workflows yet.</p>
            <button
              type="button"
              onClick={handleCreateWorkflow}
              className="rounded border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:border-blue-400 hover:bg-blue-500/20"
            >
              Create your first workflow
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {formattedWorkflows.map((workflow) => (
              <article
                key={workflow.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20"
              >
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold text-slate-50">{workflow.name}</h2>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Last updated {formatter.format(new Date(workflow.updatedAt))}
                  </p>
                  {workflow.description ? (
                    <p className="text-sm text-slate-300">{workflow.description}</p>
                  ) : null}
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectWorkflow({ id: workflow.id })}
                    className="flex-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(workflow.id)}
                    className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-200 transition hover:border-red-400 hover:bg-red-500/20"
                  >
                    {pendingDeleteId === workflow.id ? "Confirm" : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default WorkflowList;
