import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "./icon";
const VersionHistoryDrawer = ({ open, onClose, versions, activeVersionId, onSaveVersion, onRestoreVersion, onRenameVersion, onDeleteVersion }) => {
    const [newVersionName, setNewVersionName] = useState("");
    const [editingVersionId, setEditingVersionId] = useState(null);
    const [draftName, setDraftName] = useState("");
    const [pendingDeleteId, setPendingDeleteId] = useState(null);
    useEffect(() => {
        if (!open) {
            setNewVersionName("");
            setEditingVersionId(null);
            setDraftName("");
            setPendingDeleteId(null);
        }
    }, [open]);
    useEffect(() => {
        if (!open) {
            return;
        }
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => {
            window.removeEventListener("keydown", handleKeydown);
        };
    }, [open, onClose]);
    const formatter = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }), []);
    if (!open) {
        return null;
    }
    const handleCreateVersion = () => {
        onSaveVersion({ name: newVersionName.trim().length > 0 ? newVersionName.trim() : undefined });
        setNewVersionName("");
    };
    const handleRenameVersion = (versionId) => {
        const trimmed = draftName.trim();
        onRenameVersion?.({ versionId, name: trimmed.length > 0 ? trimmed : versions.find((entry) => entry.id === versionId)?.name ?? "" });
        setEditingVersionId(null);
        setDraftName("");
    };
    const handleDeleteVersion = (versionId) => {
        if (pendingDeleteId === versionId) {
            onDeleteVersion?.(versionId);
            setPendingDeleteId(null);
            return;
        }
        setPendingDeleteId(versionId);
    };
    const handleRestoreVersion = (versionId) => {
        onRestoreVersion(versionId);
        onClose();
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-end bg-[rgba(10,26,35,0.35)] backdrop-blur", role: "dialog", "aria-modal": "true", children: _jsxs("div", { className: "flex h-full w-[420px] flex-col border-l border-[#0A1A2314] bg-white shadow-[0_40px_80px_rgba(10,26,35,0.35)]", children: [_jsxs("div", { className: "flex items-center gap-3 border-b border-[#0A1A2314] bg-white px-6 py-4", children: [_jsx("span", { className: "flex h-10 w-10 items-center justify-center rounded-full bg-[#3A5AE510] text-[#3A5AE5]", children: _jsx(Icon, { name: "clock", className: "h-5 w-5", title: "Version history" }) }), _jsxs("div", { className: "flex flex-col", children: [_jsx("h2", { className: "text-base font-semibold text-[#0A1A23]", children: "Version History" }), _jsx("span", { className: "text-xs uppercase tracking-[0.3em] text-[#657782]", children: "Track and restore revisions" })] }), _jsx("button", { type: "button", onClick: onClose, className: "ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#0A1A2333] text-[#657782] transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]", "aria-label": "Close version history", children: _jsx(Icon, { name: "close", className: "h-4 w-4" }) })] }), _jsxs("div", { className: "flex flex-col gap-4 border-b border-[#0A1A2314] bg-[#F5F6F9] px-6 py-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { value: newVersionName, onChange: (event) => setNewVersionName(event.target.value), placeholder: "Name this version (optional)", className: "flex-1 rounded-md border border-[#0A1A2333] bg-white px-3 py-2 text-sm text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]" }), _jsxs("button", { type: "button", onClick: handleCreateVersion, className: "flex items-center gap-2 rounded-full border border-[#3A5AE5] bg-[#3A5AE5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d4bd4]", children: [_jsx(Icon, { name: "plus", className: "h-4 w-4" }), "Save"] })] }), _jsx("p", { className: "text-xs text-[#657782]", children: "Saved versions capture the entire workflow and can be restored at any time." })] }), _jsx("div", { className: "workflow-editor-scrollable flex-1 overflow-y-auto px-6 py-5", children: versions.length === 0 ? (_jsxs("div", { className: "flex h-full flex-col items-center justify-center gap-3 text-center text-[#657782]", children: [_jsx(Icon, { name: "file", className: "h-8 w-8" }), _jsx("p", { className: "text-sm", children: "No versions saved yet. Create versions to capture milestones." })] })) : (_jsx("ul", { className: "flex flex-col gap-3", children: versions.map((version) => {
                            const isActive = activeVersionId === version.id;
                            const isEditing = editingVersionId === version.id;
                            const isPendingDelete = pendingDeleteId === version.id;
                            const canDelete = Boolean(onDeleteVersion) && versions.length > 1;
                            return (_jsxs("li", { className: `rounded-xl border ${isActive ? "border-[#3A5AE5] bg-[#3A5AE510]" : "border-[#0A1A2314] bg-white"} px-4 py-3 shadow-sm transition`, children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [isEditing ? (_jsx("input", { value: draftName, onChange: (event) => setDraftName(event.target.value), className: "rounded-md border border-[#3A5AE5] bg-white px-2 py-1 text-sm text-[#0A1A23] outline-none focus:ring-2 focus:ring-[#3A5AE533]", autoFocus: true })) : (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-semibold text-[#0A1A23]", children: version.name }), isActive ? (_jsx("span", { className: "rounded-full bg-[#3A5AE510] px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-[#3A5AE5]", children: "Current" })) : null] })), _jsx("span", { className: "text-xs text-[#657782]", children: formatter.format(new Date(version.createdAt)) })] }), _jsx("div", { className: "flex items-center gap-2", children: isEditing ? (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => handleRenameVersion(version.id), className: "flex h-8 w-8 items-center justify-center rounded-full border border-[#32AA81] text-[#32AA81] transition hover:bg-[#32AA8110]", "aria-label": "Save version name", children: _jsx(Icon, { name: "check", className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => {
                                                                setEditingVersionId(null);
                                                                setDraftName("");
                                                            }, className: "flex h-8 w-8 items-center justify-center rounded-full border border-[#0A1A2333] text-[#657782] transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]", "aria-label": "Cancel rename", children: _jsx(Icon, { name: "close", className: "h-4 w-4" }) })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => handleRestoreVersion(version.id), className: "flex h-8 w-8 items-center justify-center rounded-full border border-[#3A5AE5] text-[#3A5AE5] transition hover:bg-[#3A5AE510]", "aria-label": "Restore this version", children: _jsx(Icon, { name: "undo", className: "h-4 w-4" }) }), onRenameVersion ? (_jsx("button", { type: "button", onClick: () => {
                                                                setEditingVersionId(version.id);
                                                                setDraftName(version.name);
                                                            }, className: "flex h-8 w-8 items-center justify-center rounded-full border border-[#0A1A2333] text-[#657782] transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]", "aria-label": "Rename version", children: _jsx(Icon, { name: "rename", className: "h-4 w-4" }) })) : null, canDelete ? (_jsx("button", { type: "button", onClick: () => handleDeleteVersion(version.id), className: `flex h-8 w-8 items-center justify-center rounded-full border transition ${isPendingDelete
                                                                ? "border-[#CD3A50] bg-[#CD3A5010] text-[#CD3A50]"
                                                                : "border-[#0A1A2333] text-[#657782] hover:border-[#CD3A50] hover:text-[#CD3A50]"}`, "aria-label": isPendingDelete ? "Confirm delete" : "Delete version", children: _jsx(Icon, { name: "trash", className: "h-4 w-4" }) })) : null] })) })] }), version.note ? (_jsx("p", { className: "mt-2 text-xs text-[#657782]", children: version.note })) : null] }, version.id));
                        }) })) })] }) }));
};
export default VersionHistoryDrawer;
