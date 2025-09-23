export const toIso = (value: number) => new Date(value).toISOString();

export const deriveNameFromDocument = (document: unknown): string | undefined => {
  if (document && typeof document === "object" && "metadata" in document) {
    const metadata = (document as Record<string, unknown>).metadata;
    if (metadata && typeof metadata === "object" && "name" in metadata) {
      const name = (metadata as Record<string, unknown>).name;
      if (typeof name === "string" && name.trim().length > 0) {
        return name.trim();
      }
    }
  }
  return undefined;
};