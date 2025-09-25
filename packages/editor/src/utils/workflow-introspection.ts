import { apiManifestEntries, blockRegistry } from "@workflow-builder/core";
import type { BlockInstance, ValueType, WorkflowDocument } from "@workflow-builder/core";

const staticIdentifierFieldByKind: Record<string, string> = {
  "variable-declaration": "identifier",
  "function-declaration": "identifier",
  "function-call": "assignTo"
};

const manifestIdentifierFieldByKind = apiManifestEntries.reduce<Record<string, string>>(
  (acc, entry) => {
    if (entry.identifierField) {
      acc[entry.blockKind] = entry.identifierField;
    }
    return acc;
  },
  {}
);

const identifierFieldByKind: Record<string, string> = {
  ...manifestIdentifierFieldByKind,
  ...staticIdentifierFieldByKind
};

type IdentifierOutputSuggestion = {
  id: string;
  label: string;
  description?: string;
  expression: string;
  valueType?: ValueType;
};

export type IdentifierSuggestion = {
  name: string;
  sourceKind: string;
  sourceLabel?: string;
  outputs: IdentifierOutputSuggestion[];
};

type IdentifierIndex = Record<string, string[]>;

type IdentifierIndexResult = {
  scopes: IdentifierIndex;
  suggestions: Map<string, IdentifierSuggestion>;
};

const buildIdentifierIndex = (document: WorkflowDocument): IdentifierIndexResult => {
  const cache: IdentifierIndex = {};
  const visited = new Set<string>();
  const identifierSuggestions = new Map<string, IdentifierSuggestion>();

  const registerIdentifier = (block: BlockInstance, identifier: string) => {
    const schema = blockRegistry.get(block.kind);
    const outputs = (schema?.outputs ?? []).map((output) => ({
      id: output.id,
      label: output.label ?? output.id,
      description: output.description,
      expression: `${identifier}.${output.id}`,
      valueType: output.valueType
    }));

    identifierSuggestions.set(identifier, {
      name: identifier,
      sourceKind: block.kind,
      sourceLabel: schema?.label ?? block.kind,
      outputs
    });
  };

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

    const identifierField = identifierFieldByKind[block.kind];
    const scopeWithBlock = [...incomingScope];
    const scopeSet = new Set(scopeWithBlock);

    const definedHere: string[] = [];
    if (identifierField) {
      const raw = (block.data as Record<string, unknown>)[identifierField];
      if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (trimmed.length > 0 && !scopeSet.has(trimmed)) {
          scopeWithBlock.push(trimmed);
          scopeSet.add(trimmed);
          definedHere.push(trimmed);
          registerIdentifier(block, trimmed);
        }
      }
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

  return { scopes: cache, suggestions: identifierSuggestions };
};

export const collectIdentifiers = (document: WorkflowDocument): string[] => {
  const { suggestions } = buildIdentifierIndex(document);
  const identifiers = new Set<string>();
  suggestions.forEach((value) => identifiers.add(value.name));
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

  const { scopes } = buildIdentifierIndex(document);
  const scoped = scopes[blockId];
  return scoped ? [...scoped] : [];
};

export const collectIdentifierSuggestions = (document: WorkflowDocument): IdentifierSuggestion[] => {
  const { suggestions } = buildIdentifierIndex(document);
  return Array.from(suggestions.values()).sort((a, b) => a.name.localeCompare(b.name));
};

export const collectIdentifierSuggestionsForBlock = (params: {
  document: WorkflowDocument;
  blockId: string | null | undefined;
}): IdentifierSuggestion[] => {
  const { document, blockId } = params;
  const { scopes, suggestions } = buildIdentifierIndex(document);

  if (!blockId) {
    return Array.from(suggestions.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  const scoped = scopes[blockId];
  if (!scoped) {
    return [];
  }

  const result: IdentifierSuggestion[] = [];
  scoped.forEach((identifier) => {
    const suggestion = suggestions.get(identifier);
    if (suggestion) {
      result.push(suggestion);
    } else {
      result.push({ name: identifier, sourceKind: "unknown", outputs: [] });
    }
  });
  return result;
};
