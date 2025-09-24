import { useCallback } from 'react';
import { useEditorStore } from '../state/editor-store';
import type { WorkflowVersioningConfig } from '../types/workflow-editor';

export const useVersioning = (versioning?: WorkflowVersioningConfig) => {
  const internalDocument = useEditorStore((state) => state.document);
  const editorCode = useEditorStore((state) => state.code);

  const createVersion = useCallback(
    (name?: string) => {
      if (!versioning) {
        return;
      }
      versioning.onSaveVersion({
        name,
        document: internalDocument,
        code: editorCode
      });
    },
    [editorCode, internalDocument, versioning]
  );

  const restoreVersion = useCallback(
    (versionId: string) => {
      versioning?.onRestoreVersion(versionId);
    },
    [versioning]
  );

  const renameVersion = useCallback(
    (versionId: string, name: string) => {
      versioning?.onRenameVersion?.({ versionId, name });
    },
    [versioning]
  );

  const deleteVersion = useCallback(
    (versionId: string) => {
      versioning?.onDeleteVersion?.(versionId);
    },
    [versioning]
  );

  return {
    createVersion,
    restoreVersion,
    renameVersion,
    deleteVersion,
  };
};
