import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '../state/editor-store';
import { generateCode, type WorkflowDocument } from '@workflows/core';

const safeGenerateCode = (document: WorkflowDocument) => {
  try {
    return generateCode(document);
  } catch {
    return "";
  }
};

export const useDocument = (document: WorkflowDocument, code?: string) => {
  const documentName = useEditorStore((state) => state.document.metadata.name);
  const renameDocument = useEditorStore((state) => state.renameDocument);
  const internalDocument = useEditorStore((state) => state.document);
  const loadWorkflowDocument = useEditorStore((state) => state.loadWorkflowDocument);

  const lastLoadedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state) => {
      lastLoadedSignatureRef.current = JSON.stringify(state.document);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    lastLoadedSignatureRef.current = JSON.stringify(internalDocument);
  }, [internalDocument]);

  useEffect(() => {
    if (!document) {
      return;
    }
    const signature = JSON.stringify(document);
    const currentCode = useEditorStore.getState().code;

    if (lastLoadedSignatureRef.current === signature) {
      if (code !== undefined && code !== currentCode) {
        useEditorStore.setState((state) => ({
          ...state,
          code,
          lastError: null,
        }));
      }
      return;
    }

    lastLoadedSignatureRef.current = signature;
    loadWorkflowDocument({ document, code: code ?? safeGenerateCode(document) });
  }, [document, code, loadWorkflowDocument]);

  const handleRename = useCallback((value: string) => {
    const trimmed = value.trim();
    renameDocument(trimmed.length > 0 ? trimmed : "Untitled Workflow");
  }, [renameDocument]);

  return {
    documentName,
    handleRename,
  };
};
