import { useMemo, useState } from "react";

import { useWorkspaceStore } from "../state/workspace-store";
import { Icon } from "./icon";

const WorkflowList = () => {
  const workflows = useWorkspaceStore((state) => state.workflows);
  const loading = useWorkspaceStore((state) => state.loadingList);
  const selectWorkflow = useWorkspaceStore((state) => state.selectWorkflow);
  const createWorkflow = useWorkspaceStore((state) => state.createWorkflow);
  const deleteWorkflow = useWorkspaceStore((state) => state.deleteWorkflow);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const formatter = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }), []);

  const handleCreateWorkflow = () => {
    const index = workflows.length + 1;
    const name = `Workflow ${index}`;
    void createWorkflow({ name });
  };

  const handleDelete = (id: string) => {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    void deleteWorkflow({ id });
    setPendingDeleteId(null);
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-[#F7F9FC] text-[#0A1A23]">
      <header className="flex w-full max-w-4xl items-center justify-between border-b border-[#E5E9F2] bg-white px-10 py-6">
        <h1 className="text-xl font-semibold">Workflows</h1>
        <button
          type="button"
          onClick={handleCreateWorkflow}
          className="flex items-center gap-2 rounded-full border border-[#3A5AE5] bg-[#3A5AE5] px-4 py-2 text-sm font-semibold text-white"
        >
          <Icon name="plus" className="h-4 w-4" title="New" />
          New
        </button>
      </header>

      <main className="flex w-full max-w-4xl flex-1 flex-col px-10 py-10">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[#657782]">
            <p>Loading workflows…</p>
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[#657782]">
            <p>No workflows yet.</p>
            <button
              type="button"
              onClick={handleCreateWorkflow}
              className="rounded-full border border-[#3A5AE5] bg-[#3A5AE5] px-4 py-2 text-sm font-semibold text-white"
            >
              Create one
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[#E5E9F2] border border-[#E5E9F2] bg-white">
            {workflows.map((workflow) => (
              <li key={workflow.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#0A1A23]">{workflow.name}</span>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[#7C8BA5]">
                    {formatter.format(new Date(workflow.updatedAt))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void selectWorkflow({ id: workflow.id });
                    }}
                    className="rounded-full border border-[#3A5AE5] bg-[#3A5AE5] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(workflow.id)}
                    className="rounded-full border border-[#CD3A50] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#CD3A50]"
                  >
                    {pendingDeleteId === workflow.id ? "Confirm" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default WorkflowList;
