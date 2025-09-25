import { useEffect, useMemo, useState } from "react";

import { editorTheme } from "../theme";
import { withAlpha } from "../utils/color";
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-end backdrop-blur"
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: withAlpha(editorTheme.colors.foreground, 0.28) }}
    >
      <div
        className="flex h-full w-[420px] flex-col border-l shadow-[0_32px_64px_rgba(10,26,35,0.30)]"
        style={{
          borderColor: editorTheme.colors.borderSubtle,
          background: editorTheme.surfaces.card,
        }}
      >
        <div
          className="flex items-center gap-3 border-b px-6 py-4"
          style={{
            borderColor: editorTheme.colors.borderSubtle,
            background: editorTheme.surfaces.card,
          }}
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              backgroundColor: withAlpha(editorTheme.colors.action, 0.12),
              color: editorTheme.colors.action,
            }}
          >
            <Icon name="clock" className="h-5 w-5" title="Version history" />
          </span>
          <div className="flex flex-col">
            <h2 className="text-base font-semibold" style={{ color: editorTheme.colors.foreground }}>
              Version History
            </h2>
            <span className="text-xs" style={{ color: editorTheme.colors.shaded }}>
              Track and restore revisions
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border transition hover:border-[var(--editor-color-action)] hover:text-[var(--editor-color-action)]"
            style={{
              borderColor: editorTheme.colors.borderStrong,
              color: editorTheme.colors.shaded,
              background: editorTheme.surfaces.card,
            }}
            aria-label="Close version history"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div
          className="flex flex-col gap-4 border-b px-6 py-4"
          style={{
            borderColor: editorTheme.colors.borderSubtle,
            background: editorTheme.colors.backgroundSoft,
          }}
        >
          <div className="flex items-center gap-2">
            <input
              value={newVersionName}
              onChange={(event) => setNewVersionName(event.target.value)}
              placeholder="Name this version (optional)"
              className="flex-1 rounded-md border bg-[var(--editor-color-background-default)] px-3 py-2 text-sm outline-none placeholder:text-[var(--editor-color-accent-muted)] focus:border-[var(--editor-color-action)] focus:ring-2 focus:ring-[var(--editor-color-action)]"
              style={{
                borderColor: editorTheme.colors.borderStrong,
                color: editorTheme.colors.foreground,
              }}
            />
            <button
              type="button"
              onClick={handleCreateVersion}
              className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--editor-color-action-hover)]"
              style={{
                borderColor: editorTheme.colors.action,
                backgroundColor: editorTheme.colors.action,
              }}
            >
              <Icon name="plus" className="h-4 w-4" />
              Save
            </button>
          </div>
          <p className="text-xs" style={{ color: editorTheme.colors.shaded }}>
            Saved versions capture the entire workflow and can be restored at any time.
          </p>
        </div>

        <div className="workflow-editor-scrollable flex-1 overflow-y-auto px-6 py-5">
          {versions.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center" style={{ color: editorTheme.colors.shaded }}>
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
                    className="rounded-lg border px-4 py-3 transition"
                    style={{
                      borderColor: isActive ? editorTheme.colors.action : editorTheme.colors.borderSubtle,
                      background: isActive
                        ? withAlpha(editorTheme.colors.action, 0.08)
                        : editorTheme.surfaces.card,
                      boxShadow: isActive ? "0 12px 22px rgba(10,26,35,0.14)" : "0 6px 12px rgba(10,26,35,0.06)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        {isEditing ? (
                          <input
                            value={draftName}
                            onChange={(event) => setDraftName(event.target.value)}
                            className="rounded-md border bg-[var(--editor-color-background-default)] px-2 py-1 text-sm outline-none placeholder:text-[var(--editor-color-accent-muted)] focus:border-[var(--editor-color-action)] focus:ring-2 focus:ring-[var(--editor-color-action)]"
                            style={{
                              borderColor: editorTheme.colors.action,
                              color: editorTheme.colors.foreground,
                            }}
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: editorTheme.colors.foreground }}>
                              {version.name}
                            </span>
                            {isActive ? (
                              <span
                                className="rounded-full px-2 py-[2px] text-[10px] font-semibold"
                                style={{
                                  backgroundColor: withAlpha(editorTheme.colors.action, 0.09),
                                  color: editorTheme.colors.action,
                                }}
                              >
                                Current
                              </span>
                            ) : null}
                          </div>
                        )}
                        <span className="text-xs" style={{ color: editorTheme.colors.accentMuted }}>
                          {formatter.format(new Date(version.createdAt))}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRenameVersion(version.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border transition hover:bg-[var(--editor-color-positive-box)]"
                              style={{
                                borderColor: editorTheme.colors.positive,
                                color: editorTheme.colors.positive,
                                backgroundColor: editorTheme.colors.backgroundDefault,
                              }}
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
                              className="flex h-8 w-8 items-center justify-center rounded-full border transition hover:border-[var(--editor-color-action)] hover:text-[var(--editor-color-action)]"
                              style={{
                                borderColor: editorTheme.colors.borderStrong,
                                color: editorTheme.colors.shaded,
                                backgroundColor: editorTheme.surfaces.card,
                              }}
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
                              className="flex h-8 w-8 items-center justify-center rounded-full border transition hover:bg-[var(--editor-color-action-box)]"
                              style={{
                                borderColor: editorTheme.colors.action,
                                color: editorTheme.colors.action,
                                backgroundColor: editorTheme.colors.backgroundDefault,
                              }}
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
                                className="flex h-8 w-8 items-center justify-center rounded-full border transition hover:border-[var(--editor-color-action)] hover:text-[var(--editor-color-action)]"
                                style={{
                                  borderColor: editorTheme.colors.borderStrong,
                                  color: editorTheme.colors.shaded,
                                  backgroundColor: editorTheme.surfaces.card,
                                }}
                                aria-label="Rename version"
                              >
                                <Icon name="rename" className="h-4 w-4" />
                              </button>
                            ) : null}
                            {canDelete ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteVersion(version.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border transition"
                                style={{
                                  borderColor: isPendingDelete
                                    ? editorTheme.colors.negative
                                    : editorTheme.colors.borderStrong,
                                  backgroundColor: isPendingDelete
                                    ? withAlpha(editorTheme.colors.negative, 0.1)
                                    : editorTheme.surfaces.card,
                                  color: isPendingDelete
                                    ? editorTheme.colors.negative
                                    : editorTheme.colors.shaded,
                                }}
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
                      <p className="mt-2 text-xs" style={{ color: editorTheme.colors.shaded }}>
                        {version.note}
                      </p>
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
