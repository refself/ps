import { create } from "zustand";

type PaletteContext = {
  parentId: string;
  slotId: string;
  index: number;
};

type PaletteState = {
  isOpen: boolean;
  context: PaletteContext | null;
  openPalette: (context?: PaletteContext | null) => void;
  closePalette: () => void;
};

export const usePaletteStore = create<PaletteState>((set) => ({
  isOpen: false,
  context: null,
  openPalette: (context) => set({ isOpen: true, context: context ?? null }),
  closePalette: () => set({ isOpen: false, context: null })
}));
