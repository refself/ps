import { useMemo, useState } from "react";

import { useWorkspaceStore } from "../state/workspace-store";
import { Icon } from "./icon";

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
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden text-[#0A1A23]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F5F6F9] via-white/60 to-white/40" />
      <header className="relative z-10 flex items-center justify-between border-b border-[#0A1A2314] bg-white/65 px-12 py-10 backdrop-blur-xl">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.6em] text-[#3A5AE580]">Workspace</span>
          <h1 className="text-3xl font-semibold tracking-tight">Workflow Library</h1>
          <p className="text-sm text-[#657782]">Pick a flow to open or craft a new automation from scratch.</p>
        </div>
      <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateWorkflow}
            className="flex items-center gap-2 rounded-full border border-[#3A5AE5] bg-[#3A5AE5] px-6 py-2 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(58,90,229,0.35)] transition hover:shadow-[0_20px_50px_rgba(58,90,229,0.4)]"
          >
            <Icon name="plus" className="h-4 w-4" title="New" />
            New Workflow
          </button>
        </div>
      </header>
      <main className="relative z-10 flex-1 overflow-y-auto px-12 py-12">
        {formattedWorkflows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-[#657782]">
            <p>No workflows yet.</p>
            <button
              type="button"
              onClick={handleCreateWorkflow}
              className="rounded-full border border-[#3A5AE5] bg-[#3A5AE5] px-6 py-2 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(58,90,229,0.35)] transition hover:shadow-[0_20px_50px_rgba(58,90,229,0.4)]"
            >
              Create your first workflow
            </button>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {formattedWorkflows.map((workflow) => (
              <article
                key={workflow.id}
                className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-[#0A1A2314] bg-white/90 p-6 shadow-[0_24px_60px_rgba(10,26,35,0.12)] transition hover:shadow-[0_32px_80px_rgba(10,26,35,0.16)]"
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-transparent opacity-0 transition group-hover:opacity-100" />
                <div className="relative flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#657782]">
                    <Icon name="workflow" className="h-3.5 w-3.5 text-[#3A5AE5]" />
                    <span>{formatter.format(new Date(workflow.updatedAt))}</span>
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight text-[#0A1A23]">{workflow.name}</h2>
                  {workflow.description ? (
                    <p className="text-sm text-[#465764]">{workflow.description}</p>
                  ) : null}
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectWorkflow({ id: workflow.id })}
                    className="flex-1 rounded-full border border-[#3A5AE5] bg-[#3A5AE5] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(58,90,229,0.28)] transition hover:shadow-[0_20px_50px_rgba(58,90,229,0.35)]"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Icon name="arrowRight" className="h-4 w-4" title="Open" />
                      Open
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(workflow.id)}
                    className="flex items-center gap-2 rounded-full border border-[#CD3A50] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#CD3A50] transition hover:bg-[#CD3A5020]"
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" title="Delete" />
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
