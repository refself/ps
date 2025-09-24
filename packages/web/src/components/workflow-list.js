import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useWorkspaceStore } from "../state/workspace-store";
import { Icon } from "./icon";
const WorkflowList = () => {
    const workflows = useWorkspaceStore((state) => state.workflows);
    const loading = useWorkspaceStore((state) => state.loadingList);
    const selectWorkflow = useWorkspaceStore((state) => state.selectWorkflow);
    const createWorkflow = useWorkspaceStore((state) => state.createWorkflow);
    const deleteWorkflow = useWorkspaceStore((state) => state.deleteWorkflow);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);
    const formatter = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }), []);
    const handleCreateWorkflow = () => {
        const index = workflows.length + 1;
        const name = `Workflow ${index}`;
        void createWorkflow({ name });
    };
    const handleDelete = (id) => {
        if (pendingDeleteId !== id) {
            setPendingDeleteId(id);
            return;
        }
        void deleteWorkflow({ id });
        setPendingDeleteId(null);
    };
    return (_jsxs("div", { className: "flex min-h-screen w-full flex-col items-center bg-[#F7F9FC] text-[#0A1A23]", children: [_jsxs("header", { className: "flex w-full max-w-4xl items-center justify-between border-b border-[#E5E9F2] bg-white px-10 py-6", children: [_jsx("h1", { className: "text-xl font-semibold", children: "Workflows" }), _jsxs("button", { type: "button", onClick: handleCreateWorkflow, className: "flex items-center gap-2 rounded-full border border-[#3A5AE5] bg-[#3A5AE5] px-4 py-2 text-sm font-semibold text-white", children: [_jsx(Icon, { name: "plus", className: "h-4 w-4", title: "New" }), "New"] })] }), _jsx("main", { className: "flex w-full max-w-4xl flex-1 flex-col px-10 py-10", children: loading ? (_jsx("div", { className: "flex flex-1 flex-col items-center justify-center gap-3 text-[#657782]", children: _jsx("p", { children: "Loading workflows\u2026" }) })) : workflows.length === 0 ? (_jsxs("div", { className: "flex flex-1 flex-col items-center justify-center gap-3 text-[#657782]", children: [_jsx("p", { children: "No workflows yet." }), _jsx("button", { type: "button", onClick: handleCreateWorkflow, className: "rounded-full border border-[#3A5AE5] bg-[#3A5AE5] px-4 py-2 text-sm font-semibold text-white", children: "Create one" })] })) : (_jsx("ul", { className: "divide-y divide-[#E5E9F2] border border-[#E5E9F2] bg-white", children: workflows.map((workflow) => (_jsxs("li", { className: "flex items-center justify-between px-5 py-4", children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-sm font-medium text-[#0A1A23]", children: workflow.name }), _jsx("span", { className: "text-[11px] uppercase tracking-[0.2em] text-[#7C8BA5]", children: formatter.format(new Date(workflow.updatedAt)) })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => {
                                            void selectWorkflow({ id: workflow.id });
                                        }, className: "rounded-full border border-[#3A5AE5] bg-[#3A5AE5] px-3 py-1.5 text-xs font-semibold text-white", children: "Open" }), _jsx("button", { type: "button", onClick: () => handleDelete(workflow.id), className: "rounded-full border border-[#CD3A50] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#CD3A50]", children: pendingDeleteId === workflow.id ? "Confirm" : "Delete" })] })] }, workflow.id))) })) })] }));
};
export default WorkflowList;
