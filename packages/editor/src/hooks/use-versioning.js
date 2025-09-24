import { useCallback } from 'react';
import { useEditorStore } from '../state/editor-store';
export const useVersioning = (versioning) => {
    const internalDocument = useEditorStore((state) => state.document);
    const editorCode = useEditorStore((state) => state.code);
    const createVersion = useCallback((name) => {
        if (!versioning) {
            return;
        }
        versioning.onSaveVersion({
            name,
            document: internalDocument,
            code: editorCode
        });
    }, [editorCode, internalDocument, versioning]);
    const restoreVersion = useCallback((versionId) => {
        versioning?.onRestoreVersion(versionId);
    }, [versioning]);
    const renameVersion = useCallback((versionId, name) => {
        versioning?.onRenameVersion?.({ versionId, name });
    }, [versioning]);
    const deleteVersion = useCallback((versionId) => {
        versioning?.onDeleteVersion?.(versionId);
    }, [versioning]);
    return {
        createVersion,
        restoreVersion,
        renameVersion,
        deleteVersion,
    };
};
