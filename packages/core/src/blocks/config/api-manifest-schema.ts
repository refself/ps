import type { BlockCategory } from "../../types/block";
import type { ValueType } from "../../types/value-type";

export type ApiFieldPrimitiveValue = string | number | boolean | null;

export type ApiEnumOption = {
  label: string;
  value: string;
};

export type ApiValueType = ValueType;

export type ApiFieldInputConfiguration =
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
      options: ApiEnumOption[];
    }
  | {
      kind: "expression";
      expressionKind?: "any" | "identifier" | "call" | "literal";
    }
  | {
      kind: "identifier";
      scope?: "any" | "variable" | "function";
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

export type ApiFieldDefinition = {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: ApiFieldPrimitiveValue;
  input: ApiFieldInputConfiguration;
  valueType?: ApiValueType;
};

export type ApiOutputDefinition = {
  id: string;
  label: string;
  description?: string;
  valueType?: ApiValueType;
};

export type ApiManifestEntry = {
  apiName: string;
  blockKind: string;
  label: string;
  category: BlockCategory;
  icon?: string;
  description?: string;
  identifierField?: string;
  fields: ApiFieldDefinition[];
  outputs: ApiOutputDefinition[];
};

export type ApiManifestDocument = {
  version: number;
  generatedAt: string;
  entries: ApiManifestEntry[];
};
