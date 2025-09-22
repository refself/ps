export type BlockCategory =
  | "program"
  | "structure"
  | "control"
  | "variables"
  | "functions"
  | "expressions"
  | "io"
  | "ai"
  | "automation"
  | "utility"
  | "raw";

export type FieldPrimitiveValue = string | number | boolean | null;

export type FieldInputConfiguration =
  | {
      kind: "string";
      multiline?: boolean;
      placeholder?: string;
    }
  | {
      kind: "number";
      min?: number;
      max?: number;
      step?: number;
    }
  | {
      kind: "boolean";
    }
  | {
      kind: "enum";
      options: Array<{ label: string; value: string }>;
    }
  | {
      kind: "expression";
      expressionKind?: "any" | "identifier" | "call" | "literal";
    }
  | {
      kind: "identifier";
      scope: "any" | "variable" | "function";
      allowCreation?: boolean;
    }
  | {
      kind: "code";
      language?: "reflow" | "json" | "text";
      placeholder?: string;
    }
  | {
      kind: "json-schema";
    };

export type BlockFieldDefinition = {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: FieldPrimitiveValue;
  input: FieldInputConfiguration;
};

export type BlockOutputDefinition = {
  id: string;
  label: string;
  description?: string;
};

export type PortDirection = "input" | "output";
export type PortKind = "flow" | "value";

export type BlockPortDefinition = {
  id: string;
  label: string;
  direction: PortDirection;
  portKind: PortKind;
  /** Optional list of allowed connection types (port kinds or block kinds). */
  accepts?: string[];
  provides?: string[];
  multiplicity?: "single" | "many";
};

export type BlockChildSlotDefinition = {
  id: string;
  label: string;
  description?: string;
  allowedKinds?: string[];
};

export type BlockSchema<TKind extends string = string> = {
  kind: TKind;
  label: string;
  category: BlockCategory;
  icon?: string;
  description?: string;
  fields: BlockFieldDefinition[];
  ports: BlockPortDefinition[];
  childSlots: BlockChildSlotDefinition[];
  outputs?: BlockOutputDefinition[];
};

export type BlockMetadata = {
  sourceLocation?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  comments?: string[];
};

export type BlockInstance<TKind extends string = string> = {
  id: string;
  kind: TKind;
  data: Record<string, unknown>;
  children: Record<string, string[]>;
  metadata?: BlockMetadata;
};

export type BlockConnection = {
  id: string;
  from: BlockPortReference;
  to: BlockPortReference;
};

export type BlockPortReference = {
  blockId: string;
  portId: string;
};
