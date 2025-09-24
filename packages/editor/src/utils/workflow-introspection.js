import { blockRegistry } from "@workflow-builder/core";
const identifierFieldByKind = {
    "variable-declaration": "identifier",
    "function-declaration": "identifier",
    "ai-call": "identifier",
    "locator-call": "identifier",
    "open-call": "identifier",
    "vision-call": "identifier",
    "screenshot-call": "assignTo",
    "read-clipboard-call": "assignTo",
    "file-reader-call": "assignTo",
    "function-call": "assignTo"
};
const buildIdentifierIndex = (document) => {
    const cache = {};
    const visited = new Set();
    const identifierSuggestions = new Map();
    const registerIdentifier = (block, identifier) => {
        const schema = blockRegistry.get(block.kind);
        const outputs = (schema?.outputs ?? []).map((output) => ({
            id: output.id,
            label: output.label ?? output.id,
            description: output.description,
            expression: `${identifier}.${output.id}`
        }));
        identifierSuggestions.set(identifier, {
            name: identifier,
            sourceKind: block.kind,
            sourceLabel: schema?.label ?? block.kind,
            outputs
        });
    };
    const traverseSlot = (blockIds, incomingScope) => {
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
    const traverseBlock = (blockId, incomingScope) => {
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
        const definedHere = [];
        if (identifierField) {
            const raw = block.data[identifierField];
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
export const collectIdentifiers = (document) => {
    const { suggestions } = buildIdentifierIndex(document);
    const identifiers = new Set();
    suggestions.forEach((value) => identifiers.add(value.name));
    return Array.from(identifiers).sort();
};
export const collectIdentifiersForBlock = (params) => {
    const { document, blockId } = params;
    if (!blockId) {
        return collectIdentifiers(document);
    }
    const { scopes } = buildIdentifierIndex(document);
    const scoped = scopes[blockId];
    return scoped ? [...scoped] : [];
};
export const collectIdentifierSuggestions = (document) => {
    const { suggestions } = buildIdentifierIndex(document);
    return Array.from(suggestions.values()).sort((a, b) => a.name.localeCompare(b.name));
};
export const collectIdentifierSuggestionsForBlock = (params) => {
    const { document, blockId } = params;
    const { scopes, suggestions } = buildIdentifierIndex(document);
    if (!blockId) {
        return Array.from(suggestions.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
    const scoped = scopes[blockId];
    if (!scoped) {
        return [];
    }
    const result = [];
    scoped.forEach((identifier) => {
        const suggestion = suggestions.get(identifier);
        if (suggestion) {
            result.push(suggestion);
        }
        else {
            result.push({ name: identifier, sourceKind: "unknown", outputs: [] });
        }
    });
    return result;
};
