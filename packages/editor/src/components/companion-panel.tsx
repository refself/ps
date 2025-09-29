import { useEffect, useMemo, useRef, useState } from "react";

import { editorTheme } from "../theme";
import type { WorkflowCompanionConfig } from "../types/workflow-editor";
import { Icon } from "./icon";

const roleLabels: Record<string, string> = {
  user: "You",
  assistant: "Companion",
  tool: "Tool",
};

const CompanionPanel = ({
  open,
  onClose,
  companion,
}: {
  open: boolean;
  onClose: () => void;
  companion: WorkflowCompanionConfig;
}) => {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { state, onSendMessage, onReset } = companion;
  const lastMessageId = state.messages.length > 0 ? state.messages[state.messages.length - 1]?.id ?? null : null;

  useEffect(() => {
    if (!open) {
      return;
    }
    const el = listRef.current;
    if (!el) {
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [open, lastMessageId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
    return () => window.clearTimeout(id);
  }, [open, state.loading, state.sending]);

  const isDisabled = state.sending || state.loading;
  const hasError = Boolean(state.error);

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed || isDisabled) {
      return;
    }
    onSendMessage(trimmed);
    setDraft("");
  };

  const lastNotes = useMemo(() => state.lastNotes.filter((note) => note.trim().length > 0), [state.lastNotes]);
  const lastTools = useMemo(() => state.lastTools.filter((tool) => tool.trim().length > 0), [state.lastTools]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Workflow companion"
      className={`pointer-events-${open ? "auto" : "none"} fixed inset-y-16 right-8 z-50 flex w-[420px] flex-col rounded-3xl border transition-all ${
        open ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"
      }`}
      style={{
        borderColor: editorTheme.colors.borderSubtle,
        background: editorTheme.surfaces.card,
        boxShadow: "0 30px 80px rgba(10, 26, 35, 0.32)",
      }}
    >
      <div
        className="flex items-center justify-between gap-3 rounded-3xl px-5 py-4"
        style={{
          borderBottom: `1px solid ${editorTheme.colors.borderSubtle}`,
          background: editorTheme.surfaces.glass,
        }}
      >
        <div className="flex flex-col">
          <span className="text-sm font-semibold" style={{ color: editorTheme.colors.foreground }}>
            Reflow Companion
          </span>
          <span className="flex items-center gap-2 text-[11px]" style={{ color: editorTheme.colors.shaded }}>
            <span className="flex items-center gap-1 rounded-md border px-1.5 py-0.5" style={{ borderColor: editorTheme.colors.borderMuted }}>
              <span className="hidden font-mono sm:inline">⌘</span>
              <span className="hidden font-mono sm:inline">L</span>
              <span className="font-mono sm:hidden">Ctrl</span>
              <span className="font-mono sm:hidden">L</span>
            </span>
            Toggle panel
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={state.loading || state.sending}
            className="rounded-full border px-3 py-1 text-[11px] font-semibold transition hover:border-[var(--editor-color-action)] hover:text-[var(--editor-color-action)] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: editorTheme.colors.borderMuted, color: editorTheme.colors.shaded }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border transition hover:border-[var(--editor-color-action)] hover:text-[var(--editor-color-action)]"
            style={{
              borderColor: editorTheme.colors.borderMuted,
              color: editorTheme.colors.shaded,
            }}
            aria-label="Close companion panel"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div
          ref={listRef}
          className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
          style={{ background: editorTheme.surfaces.card }}
        >
          {state.loading && state.messages.length === 0 ? (
            <div className="flex h-full flex-1 items-center justify-center text-sm" style={{ color: editorTheme.colors.shaded }}>
              Loading conversation…
            </div>
          ) : null}
          {state.messages.map((message) => {
            const label = roleLabels[message.role] ?? message.role;
            const isUser = message.role === 'user';
            const isTool = message.role === 'tool';
            return (
              <div key={message.id} className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                <span className="text-[11px] font-semibold" style={{ color: editorTheme.colors.shaded }}>
                  {label}
                </span>
                <div
                  className="max-w-full whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm"
                  style={{
                    border: `1px solid ${editorTheme.colors.borderSubtle}`,
                    background: isUser
                      ? editorTheme.colors.backgroundTint
                      : isTool
                        ? editorTheme.colors.backgroundSoft
                        : editorTheme.surfaces.glass,
                    color: editorTheme.colors.foreground,
                  }}
                >
                  {message.content}
                  {message.metadata?.summary ? (
                    <div className="mt-2 text-xs" style={{ color: editorTheme.colors.shaded }}>
                      {message.metadata.summary}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          {state.sending ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: editorTheme.colors.shaded }}>
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: editorTheme.colors.action }} />
              Companion is thinking…
            </div>
          ) : null}
          {hasError ? (
            <div className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: editorTheme.colors.negative, color: editorTheme.colors.negative }}>
              {state.error}
            </div>
          ) : null}
        </div>
        <div className="border-t px-5 py-4" style={{ borderColor: editorTheme.colors.borderSubtle }}>
          {lastTools.length > 0 || lastNotes.length > 0 ? (
            <div className="mb-3 space-y-2 text-[11px]" style={{ color: editorTheme.colors.shaded }}>
              {lastTools.length > 0 ? (
                <div>
                  <span className="font-semibold">Recent tools:</span> {lastTools.join(', ')}
                </div>
              ) : null}
              {lastNotes.length > 0 ? (
                <div>
                  <span className="font-semibold">Notes:</span> {lastNotes.join(' · ')}
                </div>
              ) : null}
            </div>
          ) : null}
          <div
            className="flex items-end gap-3 rounded-2xl border px-4 py-3"
            style={{ borderColor: editorTheme.colors.borderSubtle, background: editorTheme.surfaces.glass }}
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              rows={2}
              placeholder={state.loading ? 'Loading…' : 'Ask Companion to help you with this workflow'}
              disabled={isDisabled}
              className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none"
              style={{ color: editorTheme.colors.foreground }}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={draft.trim().length === 0 || isDisabled}
              className="flex h-10 w-10 items-center justify-center rounded-full transition hover:text-[var(--editor-color-action)] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                border: `1px solid ${editorTheme.colors.borderSubtle}`,
                background: editorTheme.surfaces.card,
                color: editorTheme.colors.foreground,
              }}
            >
              <Icon name="arrowRight" className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: editorTheme.colors.shaded }}>
            Press <span className="font-mono">Shift + Enter</span> for a new line. Companion knows about your workflow and available blocks.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompanionPanel;
