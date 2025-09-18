const palettes = [
  {
    chip: "border border-sky-400/40 bg-sky-500/15 hover:border-sky-300/70 hover:bg-sky-500/25",
    text: "text-sky-100"
  },
  {
    chip: "border border-emerald-400/40 bg-emerald-500/15 hover:border-emerald-300/70 hover:bg-emerald-500/25",
    text: "text-emerald-100"
  },
  {
    chip: "border border-amber-400/40 bg-amber-500/15 hover:border-amber-300/70 hover:bg-amber-500/25",
    text: "text-amber-100"
  },
  {
    chip: "border border-fuchsia-400/40 bg-fuchsia-500/15 hover:border-fuchsia-300/70 hover:bg-fuchsia-500/25",
    text: "text-fuchsia-100"
  },
  {
    chip: "border border-cyan-400/40 bg-cyan-500/15 hover:border-cyan-300/70 hover:bg-cyan-500/25",
    text: "text-cyan-100"
  },
  {
    chip: "border border-lime-400/40 bg-lime-500/15 hover:border-lime-300/70 hover:bg-lime-500/25",
    text: "text-lime-100"
  },
  {
    chip: "border border-rose-400/40 bg-rose-500/15 hover:border-rose-300/70 hover:bg-rose-500/25",
    text: "text-rose-100"
  },
  {
    chip: "border border-indigo-400/40 bg-indigo-500/15 hover:border-indigo-300/70 hover:bg-indigo-500/25",
    text: "text-indigo-100"
  }
] as const;

const hashIdentifier = (identifier: string) => {
  let hash = 0;
  for (let index = 0; index < identifier.length; index += 1) {
    hash = (hash * 31 + identifier.charCodeAt(index)) % 997;
  }
  return hash;
};

export const getIdentifierStyle = (identifier: string) => {
  if (!identifier) {
    return {
      chip: "border border-white/15 bg-white/10",
      text: "text-slate-100"
    } as const;
  }
  const palette = palettes[hashIdentifier(identifier) % palettes.length];
  return palette;
};

export type IdentifierStyle = ReturnType<typeof getIdentifierStyle>;
