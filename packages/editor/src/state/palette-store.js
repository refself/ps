import { createWithEqualityFn } from "zustand/traditional";
export const usePaletteStore = createWithEqualityFn()((set) => ({
    isOpen: false,
    context: null,
    openPalette: (context) => set({ isOpen: true, context: context ?? null }),
    closePalette: () => set({ isOpen: false, context: null })
}));
