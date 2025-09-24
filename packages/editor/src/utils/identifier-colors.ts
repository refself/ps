import { editorTheme } from "../theme";

const baseClass = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide";

const palettes = editorTheme.identifier;

const hashIdentifier = (identifier: string) => {
  let hash = 0;
  for (let index = 0; index < identifier.length; index += 1) {
    hash = (hash * 31 + identifier.charCodeAt(index)) % 997;
  }
  return hash;
};

export const getIdentifierStyle = (identifier: string) => {
  const palette = identifier ? palettes[hashIdentifier(identifier) % palettes.length] : null;

  if (!palette) {
    return {
      chipClassName: `${baseClass} border-subtle text-shaded`,
      chipStyle: {
        borderColor: editorTheme.colors.borderSubtle,
        background: editorTheme.colors.backgroundSoft,
      },
      textStyle: { color: editorTheme.colors.shaded },
    } as const;
  }

  return {
    chipClassName: baseClass,
    chipStyle: {
      borderColor: palette.border,
      background: palette.chip,
      color: palette.text,
    },
    textStyle: { color: palette.text },
  } as const;
};

export type IdentifierStyle = ReturnType<typeof getIdentifierStyle>;
