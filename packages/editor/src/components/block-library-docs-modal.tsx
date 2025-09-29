import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { apiManifestEntries } from "@workflows/core";

import { Icon, type IconName } from "./icon";
import { editorTheme } from "../theme";

type BlockLibraryDocsModalProps = {
  open: boolean;
  onClose: () => void;
};

const categoryLabels: Record<string, string> = {
  program: "Program",
  structure: "Structure",
  control: "Control",
  variables: "Variables",
  functions: "Functions",
  expressions: "Expressions",
  io: "I/O",
  ai: "AI",
  automation: "Automation",
  utility: "Utility",
  raw: "Raw"
};

const categoryIcons: Record<string, IconName> = {
  program: "workflow",
  control: "branch",
  variables: "variable",
  functions: "function",
  expressions: "expression",
  io: "link",
  ai: "sparkles",
  automation: "gear",
  utility: "wrench",
  raw: "box"
};

const BlockLibraryDocsModal = ({ open, onClose }: BlockLibraryDocsModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!open) {
      setSearchTerm("");
    }
  }, [open]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const entries = useMemo(() => {
    const sorted = apiManifestEntries
      .slice()
      .sort((a, b) => a.label.localeCompare(b.label));

    if (!normalizedSearch) {
      return sorted;
    }

    return sorted.filter((entry) => {
      const haystack = `${entry.label} ${entry.description ?? ""} ${entry.apiName} ${entry.category}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ backgroundColor: "rgba(16, 23, 42, 0.38)" }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex h-[70vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
        style={{
          background: editorTheme.colors.backgroundDefault,
          border: `1px solid ${editorTheme.colors.borderSubtle}`,
          boxShadow: "0 18px 48px rgba(15, 23, 42, 0.2)",
        }}
      >
        <header
          className="flex items-center justify-between gap-3 px-4 py-3"
          style={{ borderBottom: `1px solid ${editorTheme.colors.borderSubtle}` }}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-semibold" style={{ color: editorTheme.colors.foreground }}>
              Block reference
            </span>
            <span className="text-xs" style={{ color: editorTheme.colors.shaded }}>
              Quick lookup for available blocks and their inputs/outputs.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-2.5 py-1 text-xs font-medium transition"
            style={{
              borderColor: editorTheme.colors.borderSubtle,
              color: editorTheme.colors.shaded,
              background: editorTheme.colors.backgroundSoft,
            }}
          >
            Close
          </button>
        </header>

        <div className="flex flex-col gap-3 border-b px-4 py-3" style={{ borderColor: editorTheme.colors.borderSubtle }}>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by block, api, or description"
            className="rounded-md border px-2.5 py-1.5 text-sm outline-none focus:ring-2"
            style={{
              borderColor: editorTheme.colors.borderSubtle,
              background: editorTheme.colors.backgroundSoft,
              color: editorTheme.colors.foreground,
            }}
          />
          <div className="flex items-center gap-2 text-xs" style={{ color: editorTheme.colors.shaded }}>
            <Icon name="sparkles" className="h-4 w-4" />
            <span>
              {entries.length} {entries.length === 1 ? "block" : "blocks"}
            </span>
          </div>
        </div>

        <div className="workflow-editor-scrollable flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-3">
            {entries.map((entry) => {
              const categoryIcon = (categoryIcons[entry.category] ?? "workflow") as IconName;
              const categoryLabel = categoryLabels[entry.category] ?? entry.category;

              return (
                <article
                  key={entry.blockKind}
                  className="flex flex-col gap-3 rounded-xl border p-4"
                  style={{
                    borderColor: editorTheme.colors.borderSubtle,
                    background: editorTheme.colors.backgroundSoft,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs" style={{ color: editorTheme.colors.shaded }}>
                        <Icon name={categoryIcon} className="h-4 w-4" />
                        {categoryLabel}
                      </div>
                      <h3 className="text-base font-semibold" style={{ color: editorTheme.colors.foreground }}>
                        {entry.label}
                      </h3>
                      <span className="text-xs" style={{ color: editorTheme.colors.shaded }}>
                        {entry.description ?? ""}
                      </span>
                    </div>
                    <span className="rounded-md border px-2 py-0.5 text-xs"
                      style={{
                        borderColor: editorTheme.colors.borderMuted,
                        background: editorTheme.colors.backgroundDefault,
                        color: editorTheme.colors.shaded,
                      }}
                    >
                      {entry.apiName}
                    </span>
                  </div>

                  {entry.fields.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-semibold" style={{ color: editorTheme.colors.shaded }}>
                        Inputs ({entry.fields.length})
                      </span>
                      <div className="flex flex-col gap-2">
                        {entry.fields.map((field) => (
                          <div key={field.id} className="rounded-lg border px-3 py-2 text-sm"
                            style={{
                              borderColor: editorTheme.colors.borderSubtle,
                              background: editorTheme.colors.backgroundDefault,
                              color: editorTheme.colors.foreground,
                            }}
                          >
                            <div className="flex items-center justify-between text-xs font-semibold" style={{ color: editorTheme.colors.shaded }}>
                              <span>{field.label}</span>
                              {field.required ? <span>Required</span> : null}
                            </div>
                            {field.description ? (
                              <p className="mt-1 text-xs" style={{ color: editorTheme.colors.shaded }}>
                                {field.description}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.outputs && entry.outputs.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-semibold" style={{ color: editorTheme.colors.shaded }}>
                        Outputs ({entry.outputs.length})
                      </span>
                      <div className="flex flex-col gap-2">
                        {entry.outputs.map((output) => (
                          <div key={output.id} className="rounded-lg border px-3 py-2 text-sm"
                            style={{
                              borderColor: editorTheme.colors.borderSubtle,
                              background: editorTheme.colors.backgroundDefault,
                              color: editorTheme.colors.foreground,
                            }}
                          >
                            <div className="text-xs font-semibold" style={{ color: editorTheme.colors.shaded }}>
                              {output.label}
                            </div>
                            {output.description ? (
                              <p className="mt-1 text-xs" style={{ color: editorTheme.colors.shaded }}>
                                {output.description}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BlockLibraryDocsModal;
