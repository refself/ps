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
    <div
      className="flex min-h-screen w-full flex-col text-[#0A1A23]"
      style={{
        background:
          "linear-gradient(0deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.15) 100%), linear-gradient(176deg, #EDEEF6 3%, #F2F0F9 45%, #F0F1F7 100%)"
      }}
    >
      <header className="flex items-center justify-between border-b border-[#0A1A2314] bg-white/80 px-10 py-8 backdrop-blur">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Workflows</h1>
          <p className="text-sm text-[#657782]">Choose a workflow to open it in the editor.</p>
        </div>
      <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateWorkflow}
            className="flex items-center gap-2 rounded-lg border border-[#3A5AE5] bg-[#3A5AE5] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(58,90,229,0.25)] transition hover:shadow-[0_8px_24px_rgba(58,90,229,0.35)]"
          >
            <Icon name="plus" className="h-4 w-4" title="New" />
            New Workflow
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-10 py-12">
        {formattedWorkflows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-[#657782]">
            <p>No workflows yet.</p>
            <button
              type="button"
              onClick={handleCreateWorkflow}
              className="rounded-lg border border-[#3A5AE5] bg-[#3A5AE5] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(58,90,229,0.25)] transition hover:shadow-[0_8px_24px_rgba(58,90,229,0.35)]"
            >
              Create your first workflow
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {formattedWorkflows.map((workflow) => (
              <article
                key={workflow.id}
                className="flex flex-col gap-4 rounded-2xl border border-[#0A1A2314] bg-white p-6 shadow-[0_24px_40px_rgba(10,26,35,0.08)]"
              >
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold">{workflow.name}</h2>
                  <p className="text-xs uppercase tracking-wide text-[#657782]">
                    Last updated {formatter.format(new Date(workflow.updatedAt))}
                  </p>
                  {workflow.description ? (
                    <p className="text-sm text-[#465764]">{workflow.description}</p>
                  ) : null}
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectWorkflow({ id: workflow.id })}
                    className="flex-1 rounded-lg border border-[#3A5AE5] bg-[#3A5AE5] px-3 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(58,90,229,0.2)] transition hover:shadow-[0_8px_24px_rgba(58,90,229,0.3)]"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Icon name="arrowRight" className="h-4 w-4" title="Open" />
                      Open
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(workflow.id)}
                    className="flex items-center gap-2 rounded-lg border border-[#CD3A50] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#CD3A50] transition hover:bg-[#CD3A5020]"
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
