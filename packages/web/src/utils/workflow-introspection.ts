import type { BlockInstance, WorkflowDocument } from "@workflow-builder/core";

const variableBlockKinds = new Set([
  "variable-declaration",
  "function-declaration",
  "ai-call",
  "locator-call",
  "open-call",
  "vision-call"
]);

export const collectIdentifiers = (document: WorkflowDocument): string[] => {
  const identifiers = new Set<string>();

  const queue: BlockInstance[] = Object.values(document.blocks);
  queue.forEach((block) => {
    if (variableBlockKinds.has(block.kind)) {
      const identifier = String(block.data.identifier ?? "").trim();
      if (identifier) {
        identifiers.add(identifier);
      }
    }
  });

  return Array.from(identifiers).sort();
};
