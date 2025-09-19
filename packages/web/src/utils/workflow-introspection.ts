import { blockRegistry } from "@workflow-builder/core";
import type { BlockInstance, WorkflowDocument } from "@workflow-builder/core";

const variableBlockKinds = new Set([
  "variable-declaration",
  "function-declaration",
  "ai-call",
  "locator-call",
  "open-call",
  "vision-call"
]);

const identifierFromBlock = (block: BlockInstance): string | null => {
  if (!variableBlockKinds.has(block.kind)) {
    return null;
  }

  const raw = block.data?.identifier;
  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
};

type IdentifierIndex = Record<string, string[]>;

const buildIdentifierIndex = (document: WorkflowDocument): IdentifierIndex => {
  const cache: IdentifierIndex = {};
  const visited = new Set<string>();

  const traverseSlot = (blockIds: string[], incomingScope: string[]): string[] => {
    let currentScope = [...incomingScope];
    const seen = new Set(currentScope);

    blockIds.forEach((childId) => {
      const defined = traverseBlock(childId, currentScope);
      defined.forEach((identifier) => {
        if (!seen.has(identifier)) {
          seen.add(identifier);
          currentScope.push(identifier);
        }
      });
    });

    return currentScope;
  };

  const traverseBlock = (blockId: string, incomingScope: string[]): string[] => {
    const block = document.blocks[blockId];
    if (!block) {
      return [];
    }

    cache[blockId] = cache[blockId] ?? [...incomingScope];
    if (visited.has(blockId)) {
      return [];
    }

    visited.add(blockId);
    cache[blockId] = [...incomingScope];

    const definedHere: string[] = [];
    const identifier = identifierFromBlock(block);
    const scopeWithBlock = [...incomingScope];
    const scopeSet = new Set(scopeWithBlock);

    if (identifier && !scopeSet.has(identifier)) {
      scopeWithBlock.push(identifier);
      scopeSet.add(identifier);
      definedHere.push(identifier);
    }

    const schema = blockRegistry.get(block.kind);
    if (!schema) {
      return definedHere;
    }

    const childSlots = schema.childSlots ?? [];
    let scopeAfterChildren = [...scopeWithBlock];
    childSlots.forEach((slot) => {
      const childIds = block.children[slot.id] ?? [];
      scopeAfterChildren = traverseSlot(childIds, scopeAfterChildren);
    });

    const aggregate = new Set(definedHere);
    scopeAfterChildren.forEach((candidate) => {
      if (!incomingScope.includes(candidate)) {
        aggregate.add(candidate);
      }
    });

    return Array.from(aggregate);
  };

  traverseBlock(document.root, []);

  return cache;
};

export const collectIdentifiers = (document: WorkflowDocument): string[] => {
  const index = buildIdentifierIndex(document);
  const identifiers = new Set<string>();
  Object.values(index).forEach((scoped) => {
    scoped.forEach((identifier) => identifiers.add(identifier));
  });
  return Array.from(identifiers).sort();
};

export const collectIdentifiersForBlock = (params: {
  document: WorkflowDocument;
  blockId: string | null | undefined;
}): string[] => {
  const { document, blockId } = params;
  if (!blockId) {
    return collectIdentifiers(document);
  }

  const index = buildIdentifierIndex(document);
  const scoped = index[blockId];
  return scoped ? [...scoped] : [];
};
