export type ValueScalarKind =
  | "any"
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "image"
  | "binary"
  | "identifier"
  | "null"
  | "undefined"
  | "unknown";

export type ValueType =
  | {
      kind: ValueScalarKind;
    }
  | {
      kind: "array";
      of: ValueType;
    }
  | {
      kind: "record";
      key: ValueType;
      value: ValueType;
    }
  | {
      kind: "union";
      options: ValueType[];
    };

export const anyValueType: ValueType = { kind: "any" };
export const stringValueType: ValueType = { kind: "string" };
export const numberValueType: ValueType = { kind: "number" };
export const booleanValueType: ValueType = { kind: "boolean" };

export const isValueTypeCompatible = (
  candidate: ValueType | undefined,
  expected: ValueType | undefined
): boolean => {
  if (!expected || expected.kind === "any" || expected.kind === "unknown") {
    return true;
  }

  if (!candidate || candidate.kind === "any" || candidate.kind === "unknown") {
    return true;
  }

  if (expected.kind === "union") {
    return expected.options.some((option) => isValueTypeCompatible(candidate, option));
  }

  if (candidate.kind === "union") {
    return candidate.options.some((option) => isValueTypeCompatible(option, expected));
  }

  if (candidate.kind === "identifier" && expected.kind !== "identifier") {
    return true;
  }

  if (expected.kind === "identifier") {
    return candidate.kind === "identifier";
  }

  if (expected.kind === "array") {
    if (candidate.kind !== "array") {
      return false;
    }
    return isValueTypeCompatible(candidate.of, expected.of);
  }

  if (expected.kind === "record") {
    if (candidate.kind !== "record") {
      return false;
    }
    return isValueTypeCompatible(candidate.value, expected.value);
  }

  if (candidate.kind === "array" || candidate.kind === "record") {
    return false;
  }

  if (
    (expected.kind === "number" && candidate.kind === "integer") ||
    (expected.kind === "integer" && candidate.kind === "number")
  ) {
    return true;
  }

  return candidate.kind === expected.kind;
};
