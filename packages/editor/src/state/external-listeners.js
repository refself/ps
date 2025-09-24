let listeners = {};
export const setEditorExternalListeners = (next) => {
    listeners = next;
};
export const clearEditorExternalListeners = () => {
    listeners = {};
};
export const notifyExternalListeners = (document, code) => {
    listeners.onDocumentChange?.(document);
    listeners.onCodeChange?.(code);
};
