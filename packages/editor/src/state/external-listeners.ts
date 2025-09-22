import type { WorkflowDocument } from "@workflow-builder/core";

type ExternalListeners = {
  onDocumentChange?: (document: WorkflowDocument) => void;
  onCodeChange?: (code: string) => void;
};

let listeners: ExternalListeners = {};

export const setEditorExternalListeners = (next: ExternalListeners) => {
  listeners = next;
};

export const clearEditorExternalListeners = () => {
  listeners = {};
};

export const notifyExternalListeners = (document: WorkflowDocument, code: string) => {
  listeners.onDocumentChange?.(document);
  listeners.onCodeChange?.(code);
};
