import { useEffect, useMemo, useState } from "react";

import { Icon } from "./icon";

type VersionDescriptor = {
  id: string;
  name: string;
  createdAt: string;
  createdBy?: string;
  note?: string;
  isNamed?: boolean;
};

type VersionHistoryDrawerProps = {
  open: boolean;
  onClose: () => void;
  versions: VersionDescriptor[];
  activeVersionId?: string | null;
  onSaveVersion: (options: { name?: string }) => void;
  onRestoreVersion: (versionId: string) => void;
  onRenameVersion?: (options: { versionId: string; name: string }) => void;
  onDeleteVersion?: (versionId: string) => void;
};

const VersionHistoryDrawer = ({
  open,
  onClose,
  versions,
  activeVersionId,
  onSaveVersion,
  onRestoreVersion,
  onRenameVersion,
  onDeleteVersion
}: VersionHistoryDrawerProps) => {
  const [newVersionName, setNewVersionName] = useState("");
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [open, onClose]);

  const formatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }),
    []
  );

  if (!open) {
    return null;
  }

  const handleCreateVersion = () => {
    onSaveVersion({ name: newVersionName.trim().length > 0 ? newVersionName.trim() : undefined });
    setNewVersionName("");
  };

  const handleRenameVersion = (versionId: string) => {
    const trimmed = draftName.trim();
    onRenameVersion?.({ versionId, name: trimmed.length > 0 ? trimmed : versions.find((entry) => entry.id === versionId)?.name ?? "" });
    setEditingVersionId(null);
    setDraftName("");
  };

  const handleDeleteVersion = (versionId: string) => {
    if (pendingDeleteId === versionId) {
      onDeleteVersion?.(versionId);
      setPendingDeleteId(null);
      return;
    }
    setPendingDeleteId(versionId);
  };

  const handleRestoreVersion = (versionId: string) => {
    onRestoreVersion(versionId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-[rgba(10,26,35,0.35)] backdrop-blur" role="dialog" aria-modal="true">
      <div className="flex h-full w-[420px] flex-col border-l border-[#0A1A2314] bg-white shadow-[0_40px_80px_rgba(10,26,35,0.35)]">
        <div className="flex items-center gap-3 border-b border-[#0A1A2314] bg-white px-6 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3A5AE510] text-[#3A5AE5]">
            <Icon name="clock" className="h-5 w-5" title="Version history" />
          </span>
          <div className="flex flex-col">
            <h2 className="text-base font-semibold text-[#0A1A23]">Version History</h2>
            <span className="text-xs uppercase tracking-[0.3em] text-[#657782]">Track and restore revisions</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#0A1A2333] text-[#657782] transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]"
            aria-label="Close version history"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 border-b border-[#0A1A2314] bg-[#F5F6F9] px-6 py-4">
          <div className="flex items-center gap-2">
            <input
              value={newVersionName}
              onChange={(event) => setNewVersionName(event.target.value)}
              placeholder="Name this version (optional)"
              className="flex-1 rounded-md border border-[#0A1A2333] bg-white px-3 py-2 text-sm text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
            />
            <button
              type="button"
              onClick={handleCreateVersion}
              className="flex items-center gap-2 rounded-full border border-[#3A5AE5] bg-[#3A5AE5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d4bd4]"
            >
              <Icon name="plus" className="h-4 w-4" />
              Save
            </button>
          </div>
          <p className="text-xs text-[#657782]">
            Saved versions capture the entire workflow and can be restored at any time.
          </p>
        </div>

        <div className="workflow-editor-scrollable flex-1 overflow-y-auto px-6 py-5">
          {versions.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-[#657782]">
              <Icon name="file" className="h-8 w-8" />
              <p className="text-sm">No versions saved yet. Create versions to capture milestones.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {versions.map((version) => {
                const isActive = activeVersionId === version.id;
                const isEditing = editingVersionId === version.id;
                const isPendingDelete = pendingDeleteId === version.id;
                const canDelete = Boolean(onDeleteVersion) && versions.length > 1;
                return (
                  <li
                    key={version.id}
                    className={`rounded-xl border ${
                      isActive ? "border-[#3A5AE5] bg-[#3A5AE510]" : "border-[#0A1A2314] bg-white"
                    } px-4 py-3 shadow-sm transition`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        {isEditing ? (
                          <input
                            value={draftName}
                            onChange={(event) => setDraftName(event.target.value)}
                            className="rounded-md border border-[#3A5AE5] bg-white px-2 py-1 text-sm text-[#0A1A23] outline-none focus:ring-2 focus:ring-[#3A5AE533]"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#0A1A23]">{version.name}</span>
                            {isActive ? (
                              <span className="rounded-full bg-[#3A5AE510] px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-[#3A5AE5]">
                                Current
                              </span>
                            ) : null}
                          </div>
                        )}
                        <span className="text-xs text-[#657782]">{formatter.format(new Date(version.createdAt))}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRenameVersion(version.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#32AA81] text-[#32AA81] transition hover:bg-[#32AA8110]"
                              aria-label="Save version name"
                            >
                              <Icon name="check" className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingVersionId(null);
                                setDraftName("");
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#0A1A2333] text-[#657782] transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]"
                              aria-label="Cancel rename"
                            >
                              <Icon name="close" className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRestoreVersion(version.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#3A5AE5] text-[#3A5AE5] transition hover:bg-[#3A5AE510]"
                              aria-label="Restore this version"
                            >
                              <Icon name="undo" className="h-4 w-4" />
                            </button>
                            {onRenameVersion ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingVersionId(version.id);
                                  setDraftName(version.name);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#0A1A2333] text-[#657782] transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]"
                                aria-label="Rename version"
                              >
                                <Icon name="rename" className="h-4 w-4" />
                              </button>
                            ) : null}
                            {canDelete ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteVersion(version.id)}
                                className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                                  isPendingDelete
                                    ? "border-[#CD3A50] bg-[#CD3A5010] text-[#CD3A50]"
                                    : "border-[#0A1A2333] text-[#657782] hover:border-[#CD3A50] hover:text-[#CD3A50]"
                                }`}
                                aria-label={isPendingDelete ? "Confirm delete" : "Delete version"}
                              >
                                <Icon name="trash" className="h-4 w-4" />
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                    {version.note ? (
                      <p className="mt-2 text-xs text-[#657782]">{version.note}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryDrawer;
export type { VersionDescriptor, VersionHistoryDrawerProps };
