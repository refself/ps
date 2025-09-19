import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";

import { blockRegistry } from "@workflow-builder/core";

import { useEditorStore } from "../state/editor-store";
import { usePaletteStore } from "../state/palette-store";
import { Icon, type IconName } from "./icon";

type CommandOption = {
  kind: string;
  label: string;
  description?: string;
  category?: string;
};

const normalize = (value: string) => value.toLowerCase();

const CommandPalette = () => {
  const isOpen = usePaletteStore((state) => state.isOpen);
  const context = usePaletteStore((state) => state.context);
  const closePalette = usePaletteStore((state) => state.closePalette);
  const openPalette = usePaletteStore((state) => state.openPalette);
  const addBlock = useEditorStore((state) => state.addBlock);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo<CommandOption[]>(() => {
    const schemas = blockRegistry.list();
    return schemas
      .map((schema) => ({
        kind: schema.kind,
        label: schema.label ?? schema.kind,
        description: schema.description,
        category: schema.category
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const filtered = useMemo(() => {
    if (!query) {
      return options;
    }
    const needle = normalize(query);
    return options.filter((option) => {
      return (
        normalize(option.label).includes(needle) ||
        normalize(option.kind).includes(needle) ||
        (option.description ? normalize(option.description).includes(needle) : false)
      );
    });
  }, [options, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(filtered.length > 0 ? filtered.length - 1 : 0);
    }
  }, [activeIndex, filtered.length]);

  const handleClose = () => {
    closePalette();
  };

  const handleSelect = (option: CommandOption) => {
    const latest = useEditorStore.getState();
    const targetContext = context ?? (() => {
      const document = latest.document;
      const rootId = document.root;
      const rootBlock = document.blocks[rootId];
      const bodyChildren = rootBlock?.children.body ?? [];
      return { parentId: rootId, slotId: "body", index: bodyChildren.length };
    })();

    addBlock({ kind: option.kind, parentId: targetContext.parentId, slotId: targetContext.slotId, index: targetContext.index });
    closePalette();
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (filtered.length === 0 ? current : (current + 1) % filtered.length));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => (filtered.length === 0 ? current : (current - 1 + filtered.length) % filtered.length));
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const option = filtered[activeIndex];
        if (option) {
          handleSelect(option);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, filtered, handleClose, isOpen]);

  useEffect(() => {
    const handleGlobalHotkey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }
      if (event.key.toLowerCase() !== "k") {
        return;
      }
      event.preventDefault();
      if (isOpen) {
        closePalette();
        return;
      }
      openPalette(context ?? null);
    };
    window.addEventListener("keydown", handleGlobalHotkey);
    return () => window.removeEventListener("keydown", handleGlobalHotkey);
  }, [closePalette, context, isOpen, openPalette]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(10,26,35,0.45)] px-4 py-12 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="flex w-full max-w-xl flex-col gap-3 rounded-2xl border border-[#0A1A2333] bg-white/95 p-4 shadow-[0_32px_64px_rgba(10,26,35,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 rounded-xl border border-[#CED6E9] bg-white px-3 py-1.5">
          <Icon name="search" className="h-4 w-4 text-[#9AA7B4]" />
          <input
            ref={inputRef}
            placeholder="Search blocks…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            className="w-full bg-transparent text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4]"
          />
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#CED6E9] bg-white text-[#657782] transition hover:border-[#3A5AE5] hover:text-[#3A5AE5]"
            aria-label="Close palette"
          >
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="max-h-[420px] overflow-auto rounded-xl border border-[#0A1A2314] bg-white">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center px-6 py-12 text-sm text-[#657782]">
              No blocks match "{query}".
            </div>
          ) : (
            <ul className="flex flex-col">
              {filtered.map((option, index) => {
                const isSelected = index === activeIndex;
                const accent = categoryColors[option.category ?? ""] ?? "#3A5AE5";
                const iconName = categoryIcons[option.category ?? ""] ?? "workflow";
                return (
                  <li key={option.kind}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => handleSelect(option)}
                      className={clsx(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                        isSelected ? "bg-[#EEF2FF] text-[#0A1A23]" : "hover:bg-[#F5F6FB] text-[#0A1A23]"
                      )}
                    >
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent"
                        style={{ backgroundColor: `${accent}16`, color: accent }}
                      >
                        <Icon name={iconName} className="h-4 w-4" />
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-[#0A1A23]">{option.label}</span>
                        <span className="text-[11px] text-[#9AA7B4]">{option.kind}</span>
                        {option.description ? (
                          <span className="text-xs text-[#657782]">{option.description}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[#E1E6F2] bg-[#F7F9FD] px-3 py-2 text-[11px] text-[#657782]">
          <div className="flex items-center gap-3">
            <ShortcutChip label="Enter" description="insert" />
            <ShortcutChip label="Esc" description="close" />
          </div>
          <ShortcutChip label="⌘ / Ctrl + K" description="toggle" />
        </div>
      </div>
    </div>
  );
};

const ShortcutChip = ({ label, description }: { label: string; description: string }) => (
  <span className="flex items-center gap-1">
    <span className="rounded-md border border-[#D3DCEE] bg-white px-2 py-0.5 text-[10px] font-medium text-[#3A5AE5]">
      {label}
    </span>
    <span className="text-[10px] text-[#9AA7B4]">{description}</span>
  </span>
);

export default CommandPalette;
const categoryIcons: Record<string, IconName> = {
  program: "workflow",
  control: "branch",
  structure: "branch",
  variables: "variable",
  functions: "function",
  expressions: "expression",
  ai: "sparkles",
  automation: "gear",
  utility: "wrench",
  io: "link",
  raw: "box"
};

const categoryColors: Record<string, string> = {
  program: "#3A5AE5",
  control: "#AF54BE",
  structure: "#AF54BE",
  variables: "#E2A636",
  functions: "#32AA81",
  expressions: "#578BC9",
  ai: "#AF54BE",
  automation: "#32AA81",
  utility: "#3A5AE5",
  io: "#578BC9",
  raw: "#CD3A50"
};
