import { useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";

type SchemaNodeKind = "string" | "number" | "boolean" | "object" | "array";

type PrimitiveSchemaNode = {
  kind: "string" | "number" | "boolean";
};

type SchemaProperty = {
  id: string;
  name: string;
  required: boolean;
  schema: SchemaNode;
};

type ObjectSchemaNode = {
  kind: "object";
  properties: SchemaProperty[];
};

type ArraySchemaNode = {
  kind: "array";
  items: SchemaNode;
};

type SchemaNode = PrimitiveSchemaNode | ObjectSchemaNode | ArraySchemaNode;

type RootKind = SchemaNodeKind | "none";

type JsonSchemaEditorProps = {
  value: string;
  onChange: (next: string) => void;
  label: string;
  description?: string;
};

type ParseResult = {
  kind: RootKind;
  schema: SchemaNode;
  error?: string;
};

type TransformResult = {
  node: SchemaNode | null;
  warnings: string[];
};

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
        properties.push({
          id: nanoid(),
          name,
          required: requiredValue.includes(name),
          schema: propertySchema
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
    const json = JSON.parse(raw);
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
      properties[property.name] = toJsonSchema(property.schema);
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
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-[#657782]">
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

      {node.kind === "object" ? (
        <ObjectNodeEditor node={node} onChange={onChange} depth={depth} />
      ) : null}

      {node.kind === "array" ? (
        <ArrayNodeEditor node={node} onChange={onChange} depth={depth} />
      ) : null}
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
    const nextProperties = node.properties.map((property) =>
      property.id === propertyId ? updater(property) : property
    );
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
      name: `property${node.properties.length + 1}`,
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
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.25em] text-[#657782]">
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
                  placeholder="propertyName"
                  className="flex-1 rounded-md border border-[#0A1A2333] bg-white px-2.5 py-1.5 text-sm text-[#0A1A23] outline-none placeholder:text-[#9AA7B4] focus:border-[#3A5AE5] focus:ring-2 focus:ring-[#3A5AE533]"
                />
                <label className="flex items-center gap-1 rounded-full border border-[#0A1A2333] px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-[#657782]">
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
                  Required
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveProperty(property.id)}
                  className="flex items-center rounded-full border border-[#CD3A50] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#CD3A50] transition hover:bg-[#CD3A5014]"
                >
                  Remove
                </button>
              </div>
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
            className="self-start rounded-md border border-[#3A5AE5] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3A5AE5] transition hover:bg-[#3A5AE510]"
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
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#657782]">Items</div>
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

const JsonSchemaEditor = ({ value, onChange, label, description }: JsonSchemaEditorProps) => {
  const initialState = useMemo(() => parseSchemaValue(value), [value]);
  const [schemaState, setSchemaState] = useState<ParseResult>(initialState);
  const [parseError, setParseError] = useState<string | undefined>(initialState.error);

  useEffect(() => {
    const next = parseSchemaValue(value);
    setSchemaState(next);
    setParseError(next.error);
  }, [value]);

  const handleRootKindChange = (nextKind: RootKind) => {
    if (nextKind === "none") {
      setSchemaState((current) => ({
        kind: "none",
        schema: current.schema
      }));
      setParseError(undefined);
      onChange("");
      return;
    }

    setSchemaState((current) => {
      const schemaForKind = current.schema.kind === nextKind ? current.schema : createDefaultNode(nextKind);
      onChange(serializeSchema(schemaForKind));
      setParseError(undefined);
      return {
        kind: nextKind,
        schema: schemaForKind
      };
    });
  };

  const handleSchemaNodeChange = (updater: (current: SchemaNode) => SchemaNode) => {
    setSchemaState((current) => {
      if (current.kind === "none") {
        return current;
      }
      const nextSchema = updater(current.schema);
      onChange(serializeSchema(nextSchema));
      setParseError(undefined);
      return {
        kind: current.kind,
        schema: nextSchema
      };
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[#0A1A23]">{label}</span>
        {description ? <span className="text-xs text-[#657782]">{description}</span> : null}
      </div>

      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-[#657782]">
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

      {parseError ? (
        <div className="rounded-lg border border-[#F9D4D8] bg-[#FDF2F3] px-3 py-2 text-xs text-[#CD3A50]">
          {parseError}
        </div>
      ) : null}

      {schemaState.kind === "none" ? (
        <div className="rounded-lg border border-dashed border-[#0A1A2333] bg-[#F8FAFF] px-3 py-4 text-xs text-[#657782]">
          No schema configured. Select a schema type to start describing the AI response.
        </div>
      ) : (
        <SchemaNodeEditor
          node={schemaState.schema}
          onChange={(nextSchema) => handleSchemaNodeChange(() => nextSchema)}
          depth={0}
        />
      )}
    </div>
  );
};

export default JsonSchemaEditor;
