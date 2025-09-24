import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '../state/editor-store';
import { generateCode } from '@workflow-builder/core';
const safeGenerateCode = (document) => {
    try {
        return generateCode(document);
    }
    catch {
        return "";
    }
};
export const useDocument = (document, code) => {
    const documentName = useEditorStore((state) => state.document.metadata.name);
    const renameDocument = useEditorStore((state) => state.renameDocument);
    const internalDocument = useEditorStore((state) => state.document);
    const loadWorkflowDocument = useEditorStore((state) => state.loadWorkflowDocument);
    const lastLoadedSignatureRef = useRef(null);
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
        if (lastLoadedSignatureRef.current === signature) {
            return;
        }
        lastLoadedSignatureRef.current = signature;
        loadWorkflowDocument({ document, code: code ?? safeGenerateCode(document) });
    }, [document, code, loadWorkflowDocument]);
    const handleRename = useCallback((value) => {
        const trimmed = value.trim();
        renameDocument(trimmed.length > 0 ? trimmed : "Untitled Workflow");
    }, [renameDocument]);
    return {
        documentName,
        handleRename,
    };
};
