import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";

type SchemaNodeKind = "string" | "number" | "boolean" | "object" | "array";

type PrimitiveSchemaNode = {
  kind: "string" | "number" | "boolean";
};

type SchemaNode = PrimitiveSchemaNode | ObjectSchemaNode | ArraySchemaNode;

type SchemaProperty = {
  id: string;
  name: string;
  required: boolean;
  schema: SchemaNode;
  description?: string;
};

type ObjectSchemaNode = {
  kind: "object";
  properties: SchemaProperty[];
};

type ArraySchemaNode = {
  kind: "array";
  items: SchemaNode;
};

type RootKind = SchemaNodeKind | "none";

type ParseResult = {
  kind: RootKind;
  schema: SchemaNode;
  error?: string;
};

type TransformResult = {
  node: SchemaNode | null;
  warnings: string[];
};

type JsonSchemaEditorProps = {
  value: string;
  onChange: (next: string) => void;
  label: string;
  description?: string;
  enableQuickBuilder?: boolean;
};

type QuickFieldType = "string" | "number" | "boolean" | "string-array" | "number-array" | "boolean-array";

type QuickField = {
  id: string;
  name: string;
  type: QuickFieldType;
  required: boolean;
  description: string;
};

const QUICK_FIELD_OPTIONS: Array<{ value: QuickFieldType; label: string }> = [
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "True/False" },
  { value: "string-array", label: "Text List" },
  { value: "number-array", label: "Number List" },
  { value: "boolean-array", label: "True/False List" }
];

const defaultObjectSchema = (): ObjectSchemaNode => ({
  kind: "object",
  properties: []
});

const createDefaultNode = (kind: SchemaNodeKind): SchemaNode => {
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
      return { kind: kind as PrimitiveSchemaNode["kind"] };
  }
};

const safeParseSchema = (raw: string): unknown => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }

  try {
    return JSON.parse(trimmed);
  } catch (jsonError) {
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      throw jsonError;
    }

    try {
      // eslint-disable-next-line no-new-func
      const evaluated = new Function(`return (${trimmed});`)();
      return evaluated;
    } catch {
      throw jsonError;
    }
  }
};

const fromJsonSchema = (input: unknown): TransformResult => {
  if (!input || typeof input !== "object") {
    return { node: null, warnings: ["Schema must be an object with a type."] };
  }

  const schema = input as Record<string, unknown>;
  const typeValue = schema.type;
  const type = typeof typeValue === "string" ? typeValue : "object";

  if (type === "object") {
    const propertiesValue = schema.properties;
    const properties: SchemaProperty[] = [];
    const requiredValue = Array.isArray(schema.required)
      ? (schema.required as unknown[]).filter((item): item is string => typeof item === "string")
      : [];

    if (propertiesValue && typeof propertiesValue === "object") {
      Object.entries(propertiesValue as Record<string, unknown>).forEach(([name, value]) => {
        const child = fromJsonSchema(value);
        const propertySchema = child.node ?? { kind: "string" };
        const description =
          value && typeof value === "object" && typeof (value as Record<string, unknown>).description === "string"
            ? ((value as Record<string, unknown>).description as string)
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

const parseSchemaValue = (raw: string): ParseResult => {
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
  } catch (error) {
    return {
      kind: "object",
      schema: defaultObjectSchema(),
      error: "Unable to parse JSON schema. Editing will replace the existing value."
    };
  }
};

const toJsonSchema = (node: SchemaNode): Record<string, unknown> => {
  if (node.kind === "object") {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
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

    const result: Record<string, unknown> = {
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

const serializeSchema = (node: SchemaNode): string => {
  return JSON.stringify(toJsonSchema(node), null, 2);
};

const createQuickField = ({ name }: { name?: string } = {}): QuickField => ({
  id: nanoid(),
  name: name ?? "field",
  type: "string",
  required: false,
  description: ""
});

const quickTypeFromSchema = (node: SchemaNode): QuickFieldType | null => {
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

const schemaNodeFromQuickType = (type: QuickFieldType): SchemaNode => {
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

const extractQuickFields = (node: SchemaNode): QuickField[] | null => {
  if (node.kind !== "object") {
    return null;
  }

  const fields: QuickField[] = [];
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

const schemaFromQuickFields = (fields: QuickField[]): SchemaNode => {
  const properties: SchemaProperty[] = fields.map((field, index) => {
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

const quickFieldsEqual = (first: QuickField[], second: QuickField[]): boolean => {
  if (first.length !== second.length) {
    return false;
  }
  return first.every((field, index) => {
    const other = second[index];
    return (
      field.name === other.name &&
      field.type === other.type &&
      field.required === other.required &&
      field.description === other.description
    );
  });
};

const QUICK_COMMIT_DELAY = 400;

const JsonSchemaEditor = ({ value, onChange, label, description, enableQuickBuilder = false }: JsonSchemaEditorProps) => {
  const initialParse = parseSchemaValue(value);
  const [schemaState, setSchemaState] = useState<ParseResult>(initialParse);
  const [parseError, setParseError] = useState<string | undefined>(initialParse.error);
  const initialQuickFields =
    enableQuickBuilder && initialParse.kind === "object"
      ? extractQuickFields(initialParse.schema) ?? []
      : [];
  const [quickFields, setQuickFields] = useState<QuickField[]>(initialQuickFields);
  const skipExtractionRef = useRef(false);
  const pendingCommitRef = useRef<{ schema: SchemaNode; kind: RootKind } | null>(null);
  const [commitTick, setCommitTick] = useState(0);
  const initialMode: "quick" | "advanced" =
    enableQuickBuilder &&
    (initialParse.kind === "none" ||
      (initialParse.kind === "object" && extractQuickFields(initialParse.schema) !== null))
      ? "quick"
      : "advanced";
  const [editorMode, setEditorMode] = useState<"quick" | "advanced">(initialMode);

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

  const commitSchema = (nextSchema: SchemaNode, nextKind: RootKind = "object") => {
    setSchemaState({ kind: nextKind, schema: nextSchema });
    setParseError(undefined);
    if (nextKind === "none") {
      onChange("");
    } else {
      onChange(serializeSchema(nextSchema));
    }
  };

  const handleRootKindChange = (nextKind: RootKind) => {
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

  const handleSchemaNodeChange = (updater: (current: SchemaNode) => SchemaNode) => {
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

  const quickFieldCommitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (quickFieldCommitTimerRef.current !== null) {
        window.clearTimeout(quickFieldCommitTimerRef.current);
        quickFieldCommitTimerRef.current = null;
      }
    };
  }, []);

  const scheduleQuickSchemaCommit = useCallback(
    (fields: QuickField[]) => {
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
    },
    [commitSchema, editorMode, enableQuickBuilder]
  );

  const handleQuickFieldsCommit = useCallback(
    (updater: (current: QuickField[]) => QuickField[]) => {
      setQuickFields((current) => {
        const next = updater(current);
        scheduleQuickSchemaCommit(next);
        return next;
      });
    },
    [scheduleQuickSchemaCommit]
  );

  useEffect(() => {
    if (!pendingCommitRef.current) {
      return;
    }
    const pending = pendingCommitRef.current;
    pendingCommitRef.current = null;
    skipExtractionRef.current = false;
    commitSchema(pending.schema, pending.kind);
  }, [commitTick]);

  const quickBuilderAvailable = Boolean(
    enableQuickBuilder &&
      (schemaState.kind === "none" || (schemaState.kind === "object" && quickBuilderExtraction !== null))
  );

  const renderQuickBuilder = () => {
    return (
      <div className="flex flex-col gap-3">
        {quickFields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#0A1A2333] bg-[#F8FAFF] px-3 py-4 text-xs text-[#657782]">
            No fields defined. Add fields to describe the response structure you expect from the model.
          </div>
        ) : null}
        {quickFields.map((field) => (
          <div key={field.id} className="flex flex-col gap-3 rounded-xl border border-[#E1E6F2] bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <input
                id={`schema-field-name-${field.id}`}
                name={`schema-field-name-${field.id}`}
                value={field.name}
                onChange={(event) =>
                  handleQuickFieldsCommit(
                    (current) =>
                      current.map((candidate) =>
                        candidate.id === field.id
                          ? { ...candidate, name: event.target.value }
                          : candidate
                      )
                  )
                }
                placeholder="fieldName"
                className="flex-1 rounded-md border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
              />
              <select
                id={`schema-field-type-${field.id}`}
                name={`schema-field-type-${field.id}`}
                value={field.type}
                onChange={(event) =>
                  handleQuickFieldsCommit((current) =>
                    current.map((candidate) =>
                      candidate.id === field.id
                        ? { ...candidate, type: event.target.value as QuickFieldType }
                        : candidate
                    )
                  )
                }
                className="rounded-md border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-xs text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
              >
                {QUICK_FIELD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label
                className="flex items-center gap-1 rounded-full border border-[#0A1A2333] px-2 py-0.5 text-[10px] text-[#657782]"
                htmlFor={`schema-field-required-${field.id}`}
              >
                <input
                  type="checkbox"
                  id={`schema-field-required-${field.id}`}
                  name={`schema-field-required-${field.id}`}
                  checked={field.required}
                  onChange={(event) =>
                    handleQuickFieldsCommit((current) =>
                      current.map((candidate) =>
                        candidate.id === field.id
                          ? { ...candidate, required: event.target.checked }
                          : candidate
                      )
                    )
                  }
                  className="h-3 w-3 rounded border-[#0A1A2333] text-[#3A5AE5] focus:ring-[#3A5AE5]"
                />
                required
              </label>
              <button
                type="button"
                onClick={() =>
                  handleQuickFieldsCommit((current) =>
                    current.filter((candidate) => candidate.id !== field.id)
                  )
                }
                className="flex items-center rounded-full border border-[#CD3A50] px-2 py-0.5 text-[10px] font-semibold text-[#CD3A50] transition hover:bg-[#CD3A5014]"
              >
                remove
              </button>
            </div>
            <textarea
              id={`schema-field-description-${field.id}`}
              name={`schema-field-description-${field.id}`}
              value={field.description}
              onChange={(event) =>
                handleQuickFieldsCommit((current) =>
                  current.map((candidate) =>
                    candidate.id === field.id
                      ? { ...candidate, description: event.target.value }
                      : candidate
                  )
                )
              }
              placeholder="Describe this field (optional)"
              rows={2}
              className="w-full rounded-md border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            handleQuickFieldsCommit((current) => [
              ...current,
              createQuickField({ name: `field${current.length + 1}` })
            ])
          }
          className="self-start rounded-md border border-[#3A5AE5] px-2.5 py-1 text-[11px] font-semibold text-[#3A5AE5] transition hover:bg-[#3A5AE510]"
        >
          add field
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[#0A1A23]">{label}</span>
        {description ? <span className="text-xs text-[#657782]">{description}</span> : null}
      </div>

      <label className="flex flex-col gap-1 text-xs font-semibold text-[#657782]">
        <span>Schema Mode</span>
        <select
          value={schemaState.kind}
          onChange={(event) => handleRootKindChange(event.target.value as RootKind)}
          className="rounded-md border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-xs text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
        >
          <option value="none">No schema</option>
          <option value="object">Object</option>
          <option value="array">Array</option>
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
        </select>
      </label>

      {schemaState.kind === "object" && enableQuickBuilder ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditorMode("quick")}
            disabled={!quickBuilderAvailable}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              editorMode === "quick"
                ? "border border-[#3A5AE5] bg-[#3A5AE510] text-[#3A5AE5]"
                : quickBuilderAvailable
                ? "border border-[#0A1A2333] bg-white text-[#657782] hover:border-[#3A5AE5] hover:text-[#3A5AE5]"
                : "border border-dashed border-[#0A1A2333] bg-white text-[#9AA7B4] cursor-not-allowed"
            }`}
          >
            quick builder
          </button>
          <button
            type="button"
            onClick={() => setEditorMode("advanced")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              editorMode === "advanced"
                ? "border border-[#3A5AE5] bg-[#3A5AE510] text-[#3A5AE5]"
                : "border border-[#0A1A2333] bg-white text-[#657782] hover:border-[#3A5AE5] hover:text-[#3A5AE5]"
            }`}
          >
            advanced
          </button>
        </div>
      ) : null}

      {parseError ? (
        <div className="rounded-lg border border-[#F9D4D8] bg-[#FDF2F3] px-3 py-2 text-xs text-[#CD3A50]">{parseError}</div>
      ) : null}

      {schemaState.kind === "none" ? (
        editorMode === "quick" ? (
          renderQuickBuilder()
        ) : (
          <div className="rounded-lg border border-dashed border-[#0A1A2333] bg-[#F8FAFF] px-3 py-4 text-xs text-[#657782]">
            No schema configured. Select a schema type to start describing the AI response.
          </div>
        )
      ) : editorMode === "quick" && quickBuilderAvailable ? (
        renderQuickBuilder()
      ) : (
        <SchemaNodeEditor
          node={schemaState.schema}
          onChange={(nextSchema) => handleSchemaNodeChange(() => nextSchema)}
          depth={0}
        />
      )}

      {!quickBuilderAvailable && editorMode === "quick" ? (
        <div className="rounded-lg border border-[#F9D4D8] bg-[#FDF2F3] px-3 py-2 text-xs text-[#CD3A50]">
          quick builder is available for objects with primitive or list fields. switch to advanced to edit complex schemas.
        </div>
      ) : null}
    </div>
  );
};

type SchemaNodeEditorProps = {
  node: SchemaNode;
  onChange: (next: SchemaNode) => void;
  depth: number;
};

const SchemaNodeEditor = ({ node, onChange, depth }: SchemaNodeEditorProps) => {
  const handleKindChange = (nextKind: SchemaNodeKind) => {
    if (node.kind === nextKind) {
      return;
    }
    onChange(createDefaultNode(nextKind));
  };

  const containerClass = depth > 0 ? "flex flex-col gap-3 border-l border-[#E1E6F2] pl-3" : "flex flex-col gap-3";

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#657782]">
          <span>Type</span>
          <select
            value={node.kind}
            onChange={(event) => handleKindChange(event.target.value as SchemaNodeKind)}
            className="rounded-md border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-xs text-[#0A1A23] outline-none focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
          >
            <option value="object">Object</option>
            <option value="array">Array</option>
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
          </select>
        </label>
      </div>

      {node.kind === "object" ? <ObjectNodeEditor node={node} onChange={onChange} depth={depth} /> : null}
      {node.kind === "array" ? <ArrayNodeEditor node={node} onChange={onChange} depth={depth} /> : null}
    </div>
  );
};

type ObjectNodeEditorProps = {
  node: ObjectSchemaNode;
  onChange: (next: SchemaNode) => void;
  depth: number;
};

const ObjectNodeEditor = ({ node, onChange, depth }: ObjectNodeEditorProps) => {
  const handlePropertyUpdate = (propertyId: string, updater: (property: SchemaProperty) => SchemaProperty) => {
    const nextProperties = node.properties.map((property) => (property.id === propertyId ? updater(property) : property));
    onChange({
      kind: "object",
      properties: nextProperties
    });
  };

  const handlePropertySchemaChange = (propertyId: string, nextSchema: SchemaNode) => {
    handlePropertyUpdate(propertyId, (property) => ({
      ...property,
      schema: nextSchema
    }));
  };

  const handleAddProperty = () => {
    const nextProperty: SchemaProperty = {
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

  const handleRemoveProperty = (propertyId: string) => {
    onChange({
      kind: "object",
      properties: node.properties.filter((property) => property.id !== propertyId)
    });
  };

  const containerClass = depth === 0 ? "rounded-xl border border-[#E1E6F2] bg-[#F5F6F9] p-3" : "rounded-lg border border-[#E1E6F2] bg-[#F5F6F9] p-3";

  return (
    <div className="flex flex-col gap-3">
      <div className={containerClass}>
        <div className="flex items-center justify-between text-[10px] font-semibold text-[#657782]">
          <span>Properties</span>
          <span className="text-[#9AA7B4]">{node.properties.length}</span>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {node.properties.map((property) => (
            <div key={property.id} className="flex flex-col gap-2 rounded-lg border border-[#DDE5F3] bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={property.name}
                  onChange={(event) =>
                    handlePropertyUpdate(property.id, (current) => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                  placeholder="fieldName"
                  className="flex-1 rounded-md border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
                />
                <label className="flex items-center gap-1 rounded-full border border-[#0A1A2333] px-2 py-0.5 text-[10px] text-[#657782]">
                  <input
                    type="checkbox"
                    checked={property.required}
                    onChange={(event) =>
                      handlePropertyUpdate(property.id, (current) => ({
                        ...current,
                        required: event.target.checked
                      }))
                    }
                    className="h-3 w-3 rounded border-[#0A1A2333] text-[#3A5AE5] focus:ring-[#3A5AE5]"
                  />
                required
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveProperty(property.id)}
                  className="flex items-center rounded-full border border-[#CD3A50] px-2 py-0.5 text-[10px] font-semibold text-[#CD3A50] transition hover:bg-[#CD3A5014]"
                >
                  Remove
                </button>
              </div>
              <textarea
                value={property.description ?? ""}
                onChange={(event) =>
                  handlePropertyUpdate(property.id, (current) => ({
                    ...current,
                    description: event.target.value
                  }))
                }
                placeholder="Describe this field (optional)"
                rows={2}
                className="w-full rounded-md border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
              />
              <SchemaNodeEditor
                node={property.schema}
                onChange={(nextSchema) => handlePropertySchemaChange(property.id, nextSchema)}
                depth={depth + 1}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddProperty}
            className="self-start rounded-md border border-[#3A5AE5] px-2.5 py-1 text-[11px] font-semibold text-[#3A5AE5] transition hover:bg-[#3A5AE510]"
          >
            Add property
          </button>
        </div>
      </div>
    </div>
  );
};

type ArrayNodeEditorProps = {
  node: ArraySchemaNode;
  onChange: (next: SchemaNode) => void;
  depth: number;
};

const ArrayNodeEditor = ({ node, onChange, depth }: ArrayNodeEditorProps) => {
  const containerClass = depth === 0 ? "rounded-xl border border-[#E1E6F2] bg-[#F5F6F9] p-3" : "rounded-lg border border-[#E1E6F2] bg-[#F5F6F9] p-3";

  return (
    <div className={containerClass}>
      <div className="text-[10px] font-semibold text-[#657782]">Items</div>
      <div className="mt-3 flex flex-col gap-3">
        <SchemaNodeEditor
          node={node.items}
          onChange={(nextSchema) =>
            onChange({
              kind: "array",
              items: nextSchema
            })
          }
          depth={depth + 1}
        />
      </div>
    </div>
  );
};

export default JsonSchemaEditor;
