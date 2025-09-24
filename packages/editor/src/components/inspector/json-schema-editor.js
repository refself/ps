import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
const QUICK_FIELD_OPTIONS = [
    { value: "string", label: "Text" },
    { value: "number", label: "Number" },
    { value: "boolean", label: "True/False" },
    { value: "string-array", label: "Text List" },
    { value: "number-array", label: "Number List" },
    { value: "boolean-array", label: "True/False List" }
];
const defaultObjectSchema = () => ({
    kind: "object",
    properties: []
});
const createDefaultNode = (kind) => {
    switch (kind) {
        case "object":
            return defaultObjectSchema();
        case "array":
            return {
                kind: "array",
                items: { kind: "string" }
            };
        case "number":
        case "boolean":
        case "string":
        default:
            return { kind: kind };
    }
};
const safeParseSchema = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) {
        return {};
    }
    try {
        return JSON.parse(trimmed);
    }
    catch (jsonError) {
        if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
            throw jsonError;
        }
        try {
            // eslint-disable-next-line no-new-func
            const evaluated = new Function(`return (${trimmed});`)();
            return evaluated;
        }
        catch {
            throw jsonError;
        }
    }
};
const fromJsonSchema = (input) => {
    if (!input || typeof input !== "object") {
        return { node: null, warnings: ["Schema must be an object with a type."] };
    }
    const schema = input;
    const typeValue = schema.type;
    const type = typeof typeValue === "string" ? typeValue : "object";
    if (type === "object") {
        const propertiesValue = schema.properties;
        const properties = [];
        const requiredValue = Array.isArray(schema.required)
            ? schema.required.filter((item) => typeof item === "string")
            : [];
        if (propertiesValue && typeof propertiesValue === "object") {
            Object.entries(propertiesValue).forEach(([name, value]) => {
                const child = fromJsonSchema(value);
                const propertySchema = child.node ?? { kind: "string" };
                const description = value && typeof value === "object" && typeof value.description === "string"
                    ? value.description
                    : undefined;
                properties.push({
                    id: nanoid(),
                    name,
                    required: requiredValue.includes(name),
                    schema: propertySchema,
                    description
                });
            });
        }
        return {
            node: {
                kind: "object",
                properties
            },
            warnings: []
        };
    }
    if (type === "array") {
        const itemsValue = schema.items;
        const child = fromJsonSchema(itemsValue);
        const itemsSchema = child.node ?? { kind: "string" };
        return {
            node: {
                kind: "array",
                items: itemsSchema
            },
            warnings: child.warnings
        };
    }
    if (type === "string" || type === "number" || type === "boolean") {
        return {
            node: { kind: type },
            warnings: []
        };
    }
    return {
        node: null,
        warnings: [`Unsupported schema type "${String(type)}". Defaulted to object.`]
    };
};
const parseSchemaValue = (raw) => {
    if (!raw || raw.trim() === "") {
        return {
            kind: "none",
            schema: defaultObjectSchema()
        };
    }
    try {
        const json = safeParseSchema(raw);
        const transformed = fromJsonSchema(json);
        if (!transformed.node) {
            return {
                kind: "object",
                schema: defaultObjectSchema(),
                error: transformed.warnings.join(" ") || "Schema structure is unsupported."
            };
        }
        const node = transformed.node;
        return {
            kind: node.kind,
            schema: node,
            error: transformed.warnings.length > 0 ? transformed.warnings.join(" ") : undefined
        };
    }
    catch (error) {
        return {
            kind: "object",
            schema: defaultObjectSchema(),
            error: "Unable to parse JSON schema. Editing will replace the existing value."
        };
    }
};
const toJsonSchema = (node) => {
    if (node.kind === "object") {
        const properties = {};
        const required = [];
        node.properties.forEach((property) => {
            if (!property.name) {
                return;
            }
            const propertySchema = toJsonSchema(property.schema);
            if (property.description?.trim()) {
                propertySchema.description = property.description.trim();
            }
            properties[property.name] = propertySchema;
            if (property.required) {
                required.push(property.name);
            }
        });
        const result = {
            type: "object",
            properties
        };
        if (required.length > 0) {
            result.required = required;
        }
        return result;
    }
    if (node.kind === "array") {
        return {
            type: "array",
            items: toJsonSchema(node.items)
        };
    }
    return { type: node.kind };
};
const serializeSchema = (node) => {
    return JSON.stringify(toJsonSchema(node), null, 2);
};
const createQuickField = ({ name } = {}) => ({
    id: nanoid(),
    name: name ?? "field",
    type: "string",
    required: false,
    description: ""
});
const quickTypeFromSchema = (node) => {
    if (node.kind === "string") {
        return "string";
    }
    if (node.kind === "number") {
        return "number";
    }
    if (node.kind === "boolean") {
        return "boolean";
    }
    if (node.kind === "array") {
        if (node.items.kind === "string") {
            return "string-array";
        }
        if (node.items.kind === "number") {
            return "number-array";
        }
        if (node.items.kind === "boolean") {
            return "boolean-array";
        }
        return null;
    }
    return null;
};
const schemaNodeFromQuickType = (type) => {
    switch (type) {
        case "string":
            return { kind: "string" };
        case "number":
            return { kind: "number" };
        case "boolean":
            return { kind: "boolean" };
        case "string-array":
            return { kind: "array", items: { kind: "string" } };
        case "number-array":
            return { kind: "array", items: { kind: "number" } };
        case "boolean-array":
            return { kind: "array", items: { kind: "boolean" } };
        default:
            return { kind: "string" };
    }
};
const extractQuickFields = (node) => {
    if (node.kind !== "object") {
        return null;
    }
    const fields = [];
    for (let index = 0; index < node.properties.length; index += 1) {
        const property = node.properties[index];
        const type = quickTypeFromSchema(property.schema);
        if (!type) {
            return null;
        }
        const baseName = property.name.trim();
        const derivedId = `${index}-${baseName || "field"}`;
        fields.push({
            id: derivedId,
            name: property.name,
            type,
            required: property.required,
            description: property.description ?? ""
        });
    }
    return fields;
};
const schemaFromQuickFields = (fields) => {
    const properties = fields.map((field, index) => {
        const trimmedName = field.name.trim();
        const finalName = trimmedName.length > 0 ? trimmedName : `field${index + 1}`;
        const rawDescription = field.description;
        const trimmedDescription = rawDescription.trim();
        return {
            id: field.id,
            name: finalName,
            required: field.required,
            schema: schemaNodeFromQuickType(field.type),
            description: trimmedDescription.length > 0 ? rawDescription : undefined
        };
    });
    return {
        kind: "object",
        properties
    };
};
const quickFieldsEqual = (first, second) => {
    if (first.length !== second.length) {
        return false;
    }
    return first.every((field, index) => {
        const other = second[index];
        return (field.name === other.name &&
            field.type === other.type &&
            field.required === other.required &&
            field.description === other.description);
    });
};
const QUICK_COMMIT_DELAY = 400;
const JsonSchemaEditor = ({ value, onChange, label, description, enableQuickBuilder = false }) => {
    const initialParse = parseSchemaValue(value);
    const [schemaState, setSchemaState] = useState(initialParse);
    const [parseError, setParseError] = useState(initialParse.error);
    const initialQuickFields = enableQuickBuilder && initialParse.kind === "object"
        ? extractQuickFields(initialParse.schema) ?? []
        : [];
    const [quickFields, setQuickFields] = useState(initialQuickFields);
    const skipExtractionRef = useRef(false);
    const pendingCommitRef = useRef(null);
    const [commitTick, setCommitTick] = useState(0);
    const initialMode = enableQuickBuilder &&
        (initialParse.kind === "none" ||
            (initialParse.kind === "object" && extractQuickFields(initialParse.schema) !== null))
        ? "quick"
        : "advanced";
    const [editorMode, setEditorMode] = useState(initialMode);
    useEffect(() => {
        if (skipExtractionRef.current) {
            return;
        }
        const next = parseSchemaValue(value);
        if (next.kind === "object") {
            setQuickFields((current) => {
                const extracted = extractQuickFields(next.schema);
                if (!extracted) {
                    return current;
                }
                return quickFieldsEqual(current, extracted) ? current : extracted;
            });
        }
        setSchemaState(next);
        setParseError(next.error);
    }, [value]);
    const quickBuilderExtraction = useMemo(() => {
        if (!enableQuickBuilder || schemaState.kind !== "object") {
            return null;
        }
        return extractQuickFields(schemaState.schema);
    }, [enableQuickBuilder, schemaState]);
    useEffect(() => {
        if (editorMode !== "quick") {
            return;
        }
        if (skipExtractionRef.current) {
            skipExtractionRef.current = false;
            return;
        }
        if (schemaState.kind !== "object") {
            setEditorMode("advanced");
            return;
        }
        if (!quickBuilderExtraction) {
            setEditorMode("advanced");
            return;
        }
        if (quickFields.some((field) => field.name.trim() === "")) {
            return;
        }
        setQuickFields((current) => {
            const equals = quickFieldsEqual(current, quickBuilderExtraction);
            return equals ? current : quickBuilderExtraction;
        });
    }, [editorMode, schemaState.kind, quickBuilderExtraction, quickFields]);
    useEffect(() => {
        if (schemaState.kind === "object" && !quickBuilderExtraction) {
            skipExtractionRef.current = false;
        }
    }, [schemaState.kind, quickBuilderExtraction]);
    const commitSchema = (nextSchema, nextKind = "object") => {
        setSchemaState({ kind: nextKind, schema: nextSchema });
        setParseError(undefined);
        if (nextKind === "none") {
            onChange("");
        }
        else {
            onChange(serializeSchema(nextSchema));
        }
    };
    const handleRootKindChange = (nextKind) => {
        if (nextKind === "none") {
            setQuickFields([]);
            setEditorMode(enableQuickBuilder ? "quick" : "advanced");
            skipExtractionRef.current = false;
            commitSchema(defaultObjectSchema(), "none");
            return;
        }
        const nextSchema = createDefaultNode(nextKind);
        if (nextKind === "object" && enableQuickBuilder) {
            setEditorMode("quick");
        }
        commitSchema(nextSchema, nextKind);
    };
    const handleSchemaNodeChange = (updater) => {
        setSchemaState((current) => {
            if (current.kind === "none") {
                const nextSchema = updater(defaultObjectSchema());
                commitSchema(nextSchema, "object");
                return { kind: "object", schema: nextSchema };
            }
            const nextSchema = updater(current.schema);
            commitSchema(nextSchema, current.kind);
            return { kind: current.kind, schema: nextSchema };
        });
    };
    const quickFieldCommitTimerRef = useRef(null);
    useEffect(() => {
        return () => {
            if (quickFieldCommitTimerRef.current !== null) {
                window.clearTimeout(quickFieldCommitTimerRef.current);
                quickFieldCommitTimerRef.current = null;
            }
        };
    }, []);
    const scheduleQuickSchemaCommit = useCallback((fields) => {
        if (!enableQuickBuilder || editorMode !== "quick") {
            return;
        }
        if (fields.some((field) => field.name.trim() === "")) {
            if (quickFieldCommitTimerRef.current !== null) {
                window.clearTimeout(quickFieldCommitTimerRef.current);
                quickFieldCommitTimerRef.current = null;
            }
            skipExtractionRef.current = false;
            return;
        }
        if (quickFieldCommitTimerRef.current !== null) {
            window.clearTimeout(quickFieldCommitTimerRef.current);
        }
        skipExtractionRef.current = true;
        quickFieldCommitTimerRef.current = window.setTimeout(() => {
            pendingCommitRef.current = {
                schema: schemaFromQuickFields(fields),
                kind: "object"
            };
            quickFieldCommitTimerRef.current = null;
            setCommitTick((tick) => tick + 1);
        }, QUICK_COMMIT_DELAY);
    }, [commitSchema, editorMode, enableQuickBuilder]);
    const handleQuickFieldsCommit = useCallback((updater) => {
        setQuickFields((current) => {
            const next = updater(current);
            scheduleQuickSchemaCommit(next);
            return next;
        });
    }, [scheduleQuickSchemaCommit]);
    useEffect(() => {
        if (!pendingCommitRef.current) {
            return;
        }
        const pending = pendingCommitRef.current;
        pendingCommitRef.current = null;
        skipExtractionRef.current = false;
        commitSchema(pending.schema, pending.kind);
    }, [commitTick]);
    const quickBuilderAvailable = Boolean(enableQuickBuilder &&
        (schemaState.kind === "none" || (schemaState.kind === "object" && quickBuilderExtraction !== null)));
    const renderQuickBuilder = () => {
        return (_jsxs("div", { className: "flex flex-col gap-3", children: [quickFields.length === 0 ? (_jsx("div", { className: "rounded-lg border border-dashed border-[#0A1A2333] bg-[#F8FAFF] px-3 py-4 text-xs text-[#657782]", children: "No fields defined. Add fields to describe the response structure you expect from the model." })) : null, quickFields.map((field) => (_jsxs("div", { className: "flex flex-col gap-3 rounded-xl border border-[#E1E6F2] bg-white p-3 shadow-sm", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("input", { id: `schema-field-name-${field.id}`, name: `schema-field-name-${field.id}`, value: field.name, onChange: (event) => handleQuickFieldsCommit((current) => current.map((candidate) => candidate.id === field.id
                                        ? { ...candidate, name: event.target.value }
                                        : candidate)), placeholder: "fieldName", className: "flex-1 rounded-md border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]" }), _jsx("select", { id: `schema-field-type-${field.id}`, name: `schema-field-type-${field.id}`, value: field.type, onChange: (event) => handleQuickFieldsCommit((current) => current.map((candidate) => candidate.id === field.id
                                        ? { ...candidate, type: event.target.value }
                                        : candidate)), className: "rounded-md border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-xs text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]", children: QUICK_FIELD_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) }), _jsxs("label", { className: "flex items-center gap-1 rounded-full border border-[#0A1A2333] px-2 py-0.5 text-[10px] text-[#657782]", htmlFor: `schema-field-required-${field.id}`, children: [_jsx("input", { type: "checkbox", id: `schema-field-required-${field.id}`, name: `schema-field-required-${field.id}`, checked: field.required, onChange: (event) => handleQuickFieldsCommit((current) => current.map((candidate) => candidate.id === field.id
                                                ? { ...candidate, required: event.target.checked }
                                                : candidate)), className: "h-3 w-3 rounded border-[#0A1A2333] text-[#3A5AE5] focus:ring-[#3A5AE5]" }), "required"] }), _jsx("button", { type: "button", onClick: () => handleQuickFieldsCommit((current) => current.filter((candidate) => candidate.id !== field.id)), className: "flex items-center rounded-full border border-[#CD3A50] px-2 py-0.5 text-[10px] font-semibold text-[#CD3A50] transition hover:bg-[#CD3A5014]", children: "remove" })] }), _jsx("textarea", { id: `schema-field-description-${field.id}`, name: `schema-field-description-${field.id}`, value: field.description, onChange: (event) => handleQuickFieldsCommit((current) => current.map((candidate) => candidate.id === field.id
                                ? { ...candidate, description: event.target.value }
                                : candidate)), placeholder: "Describe this field (optional)", rows: 2, className: "w-full rounded-md border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]" })] }, field.id))), _jsx("button", { type: "button", onClick: () => handleQuickFieldsCommit((current) => [
                        ...current,
                        createQuickField({ name: `field${current.length + 1}` })
                    ]), className: "self-start rounded-md border border-[#3A5AE5] px-2.5 py-1 text-[11px] font-semibold text-[#3A5AE5] transition hover:bg-[#3A5AE510]", children: "add field" })] }));
    };
    return (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-sm font-medium text-[#0A1A23]", children: label }), description ? _jsx("span", { className: "text-xs text-[#657782]", children: description }) : null] }), _jsxs("label", { className: "flex flex-col gap-1 text-xs font-semibold text-[#657782]", children: [_jsx("span", { children: "Schema Mode" }), _jsxs("select", { value: schemaState.kind, onChange: (event) => handleRootKindChange(event.target.value), className: "rounded-md border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-xs text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]", children: [_jsx("option", { value: "none", children: "No schema" }), _jsx("option", { value: "object", children: "Object" }), _jsx("option", { value: "array", children: "Array" }), _jsx("option", { value: "string", children: "String" }), _jsx("option", { value: "number", children: "Number" }), _jsx("option", { value: "boolean", children: "Boolean" })] })] }), schemaState.kind === "object" && enableQuickBuilder ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => setEditorMode("quick"), disabled: !quickBuilderAvailable, className: `rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${editorMode === "quick"
                            ? "border border-[#3A5AE5] bg-[#3A5AE510] text-[#3A5AE5]"
                            : quickBuilderAvailable
                                ? "border border-[#0A1A2333] bg-white text-[#657782] hover:border-[#3A5AE5] hover:text-[#3A5AE5]"
                                : "border border-dashed border-[#0A1A2333] bg-white text-[#9AA7B4] cursor-not-allowed"}`, children: "quick builder" }), _jsx("button", { type: "button", onClick: () => setEditorMode("advanced"), className: `rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${editorMode === "advanced"
                            ? "border border-[#3A5AE5] bg-[#3A5AE510] text-[#3A5AE5]"
                            : "border border-[#0A1A2333] bg-white text-[#657782] hover:border-[#3A5AE5] hover:text-[#3A5AE5]"}`, children: "advanced" })] })) : null, parseError ? (_jsx("div", { className: "rounded-lg border border-[#F9D4D8] bg-[#FDF2F3] px-3 py-2 text-xs text-[#CD3A50]", children: parseError })) : null, schemaState.kind === "none" ? (editorMode === "quick" ? (renderQuickBuilder()) : (_jsx("div", { className: "rounded-lg border border-dashed border-[#0A1A2333] bg-[#F8FAFF] px-3 py-4 text-xs text-[#657782]", children: "No schema configured. Select a schema type to start describing the AI response." }))) : editorMode === "quick" && quickBuilderAvailable ? (renderQuickBuilder()) : (_jsx(SchemaNodeEditor, { node: schemaState.schema, onChange: (nextSchema) => handleSchemaNodeChange(() => nextSchema), depth: 0 })), !quickBuilderAvailable && editorMode === "quick" ? (_jsx("div", { className: "rounded-lg border border-[#F9D4D8] bg-[#FDF2F3] px-3 py-2 text-xs text-[#CD3A50]", children: "quick builder is available for objects with primitive or list fields. switch to advanced to edit complex schemas." })) : null] }));
};
const SchemaNodeEditor = ({ node, onChange, depth }) => {
    const handleKindChange = (nextKind) => {
        if (node.kind === nextKind) {
            return;
        }
        onChange(createDefaultNode(nextKind));
    };
    const containerClass = depth > 0 ? "flex flex-col gap-3 border-l border-[#E1E6F2] pl-3" : "flex flex-col gap-3";
    return (_jsxs("div", { className: containerClass, children: [_jsx("div", { className: "flex items-center gap-2", children: _jsxs("label", { className: "flex flex-col gap-1 text-xs font-semibold text-[#657782]", children: [_jsx("span", { children: "Type" }), _jsxs("select", { value: node.kind, onChange: (event) => handleKindChange(event.target.value), className: "rounded-md border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-xs text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]", children: [_jsx("option", { value: "object", children: "Object" }), _jsx("option", { value: "array", children: "Array" }), _jsx("option", { value: "string", children: "String" }), _jsx("option", { value: "number", children: "Number" }), _jsx("option", { value: "boolean", children: "Boolean" })] })] }) }), node.kind === "object" ? _jsx(ObjectNodeEditor, { node: node, onChange: onChange, depth: depth }) : null, node.kind === "array" ? _jsx(ArrayNodeEditor, { node: node, onChange: onChange, depth: depth }) : null] }));
};
const ObjectNodeEditor = ({ node, onChange, depth }) => {
    const handlePropertyUpdate = (propertyId, updater) => {
        const nextProperties = node.properties.map((property) => (property.id === propertyId ? updater(property) : property));
        onChange({
            kind: "object",
            properties: nextProperties
        });
    };
    const handlePropertySchemaChange = (propertyId, nextSchema) => {
        handlePropertyUpdate(propertyId, (property) => ({
            ...property,
            schema: nextSchema
        }));
    };
    const handleAddProperty = () => {
        const nextProperty = {
            id: nanoid(),
            name: `field${node.properties.length + 1}`,
            required: false,
            schema: { kind: "string" }
        };
        onChange({
            kind: "object",
            properties: [...node.properties, nextProperty]
        });
    };
    const handleRemoveProperty = (propertyId) => {
        onChange({
            kind: "object",
            properties: node.properties.filter((property) => property.id !== propertyId)
        });
    };
    const containerClass = depth === 0 ? "rounded-xl border border-[#E1E6F2] bg-[#F5F6F9] p-3" : "rounded-lg border border-[#E1E6F2] bg-[#F5F6F9] p-3";
    return (_jsx("div", { className: "flex flex-col gap-3", children: _jsxs("div", { className: containerClass, children: [_jsxs("div", { className: "flex items-center justify-between text-[10px] font-semibold text-[#657782]", children: [_jsx("span", { children: "Properties" }), _jsx("span", { className: "text-[#9AA7B4]", children: node.properties.length })] }), _jsxs("div", { className: "mt-3 flex flex-col gap-3", children: [node.properties.map((property) => (_jsxs("div", { className: "flex flex-col gap-2 rounded-lg border border-[#DDE5F3] bg-white p-3", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("input", { value: property.name, onChange: (event) => handlePropertyUpdate(property.id, (current) => ({
                                                ...current,
                                                name: event.target.value
                                            })), placeholder: "fieldName", className: "flex-1 rounded-md border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]" }), _jsxs("label", { className: "flex items-center gap-1 rounded-full border border-[#0A1A2333] px-2 py-0.5 text-[10px] text-[#657782]", children: [_jsx("input", { type: "checkbox", checked: property.required, onChange: (event) => handlePropertyUpdate(property.id, (current) => ({
                                                        ...current,
                                                        required: event.target.checked
                                                    })), className: "h-3 w-3 rounded border-[#0A1A2333] text-[#3A5AE5] focus:ring-[#3A5AE5]" }), "required"] }), _jsx("button", { type: "button", onClick: () => handleRemoveProperty(property.id), className: "flex items-center rounded-full border border-[#CD3A50] px-2 py-0.5 text-[10px] font-semibold text-[#CD3A50] transition hover:bg-[#CD3A5014]", children: "Remove" })] }), _jsx("textarea", { value: property.description ?? "", onChange: (event) => handlePropertyUpdate(property.id, (current) => ({
                                        ...current,
                                        description: event.target.value
                                    })), placeholder: "Describe this field (optional)", rows: 2, className: "w-full rounded-md border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]" }), _jsx(SchemaNodeEditor, { node: property.schema, onChange: (nextSchema) => handlePropertySchemaChange(property.id, nextSchema), depth: depth + 1 })] }, property.id))), _jsx("button", { type: "button", onClick: handleAddProperty, className: "self-start rounded-md border border-[#3A5AE5] px-2.5 py-1 text-[11px] font-semibold text-[#3A5AE5] transition hover:bg-[#3A5AE510]", children: "Add property" })] })] }) }));
};
const ArrayNodeEditor = ({ node, onChange, depth }) => {
    const containerClass = depth === 0 ? "rounded-xl border border-[#E1E6F2] bg-[#F5F6F9] p-3" : "rounded-lg border border-[#E1E6F2] bg-[#F5F6F9] p-3";
    return (_jsxs("div", { className: containerClass, children: [_jsx("div", { className: "text-[10px] font-semibold text-[#657782]", children: "Items" }), _jsx("div", { className: "mt-3 flex flex-col gap-3", children: _jsx(SchemaNodeEditor, { node: node.items, onChange: (nextSchema) => onChange({
                        kind: "array",
                        items: nextSchema
                    }), depth: depth + 1 }) })] }));
};
export default JsonSchemaEditor;
