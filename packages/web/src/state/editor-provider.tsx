import { ReactNode, createContext, useContext, useMemo } from "react";

import { useEditorStore } from "./editor-store";

export type EditorContextValue = {
  documentName: string;
  renameDocument: (name: string) => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export const EditorProvider = ({ children }: { children: ReactNode }) => {
  const documentName = useEditorStore((state) => state.document.metadata.name);
  const renameDocument = useEditorStore((state) => state.renameDocument);

  const value = useMemo(
    () => ({
      documentName,
      renameDocument
    }),
    [documentName, renameDocument]
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};

export const useEditorContext = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditorContext must be used within an EditorProvider");
  }
  return context;
};
