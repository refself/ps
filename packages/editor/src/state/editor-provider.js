import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from "react";
import { useEditorStore } from "./editor-store";
const EditorContext = createContext(null);
export const EditorProvider = ({ children }) => {
    const documentName = useEditorStore((state) => state.document.metadata.name);
    const renameDocument = useEditorStore((state) => state.renameDocument);
    const value = useMemo(() => ({
        documentName,
        renameDocument
    }), [documentName, renameDocument]);
    return _jsx(EditorContext.Provider, { value: value, children: children });
};
export const useEditorContext = () => {
    const context = useContext(EditorContext);
    if (!context) {
        throw new Error("useEditorContext must be used within an EditorProvider");
    }
    return context;
};
