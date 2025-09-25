#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const coreRoot = dirname(__dirname);
const repoRoot = dirname(dirname(coreRoot));

const tempDir = join(coreRoot, "tmp");
const manifestJsonPath = join(tempDir, "api-manifest.json");
const outputPath = join(coreRoot, "src", "blocks", "config", "api-manifest.ts");

mkdirSync(tempDir, { recursive: true });

const swiftResult = spawnSync(
  "swift",
  ["run", "--package-path", join(repoRoot, "reflow-operator"), "reflow", "manifest", "--output", manifestJsonPath],
  { stdio: "inherit" }
);

if (swiftResult.status !== 0) {
  process.exit(swiftResult.status ?? 1);
}

const manifest = JSON.parse(readFileSync(manifestJsonPath, "utf8"));
rmSync(tempDir, { recursive: true, force: true });

const indent = (value, level) => {
  const prefix = "  ".repeat(level);
  return value
    .split("\n")
    .map((line) => (line.length > 0 ? prefix + line : line))
    .join("\n");
};

const escapeString = (value) => value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\"/g, '\\"');

const quote = (value) => `"${escapeString(value)}"`;

const serializeBoolean = (value) => (value ? "true" : "false");

const serializeDefaultValue = (value) => {
  if (typeof value === "boolean") {
    return serializeBoolean(value);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "null";
  }
  if (typeof value === "string") {
    return quote(value);
  }
  return "null";
};

const serializeValueType = (valueType) => {
  if (!valueType) {
    return undefined;
  }
  const serialized = JSON.stringify(valueType);
  return serialized;
};

const serializeOptions = (options, level) => {
  if (!options || options.length === 0) {
    return "[]";
  }
  const items = options.map((option) => `{
${indent(`label: ${quote(option.label)},`, level + 2)}
${indent(`value: ${quote(option.value)}`, level + 2)}
${indent(`}`, level + 1)}`);
  return `[
${items.join(",\n")}
${indent("]", level)}`;
};

const serializeInput = (input, level) => {
  const keys = ["kind", "multiline", "placeholder", "min", "max", "step", "options", "scope", "allowCreation", "language", "expressionKind"];
  const lines = ["{"];
  keys.forEach((key, index) => {
    if (input[key] === undefined) {
      return;
    }
    let valueString;
    if (key === "kind") {
      valueString = quote(input[key]);
    } else if (key === "options") {
      valueString = serializeOptions(input.options, level + 1);
    } else if (typeof input[key] === "string") {
      valueString = quote(input[key]);
    } else if (typeof input[key] === "boolean") {
      valueString = serializeBoolean(input[key]);
    } else {
      valueString = String(input[key]);
    }
    const trailingComma = keys.slice(index + 1).some((remainingKey) => input[remainingKey] !== undefined) ? "," : "";
    lines.push(indent(`${key}: ${valueString}${trailingComma}`, level + 1));
  });
  lines.push(indent("}", level));
  return lines.join("\n");
};

const serializeField = (field, level) => {
  const lines = ["{"];
  lines.push(indent(`id: ${quote(field.id)},`, level + 1));
  lines.push(indent(`label: ${quote(field.label)},`, level + 1));
  if (field.description) {
    lines.push(indent(`description: ${quote(field.description)},`, level + 1));
  }
  if (typeof field.required === "boolean") {
    lines.push(indent(`required: ${serializeBoolean(field.required)},`, level + 1));
  }
  if (field.defaultValue !== undefined && field.defaultValue !== null) {
    lines.push(indent(`defaultValue: ${serializeDefaultValue(field.defaultValue)},`, level + 1));
  }
  const inputLine = `input: ${serializeInput(field.input, level + 1)}`;
  const valueType = serializeValueType(field.valueType);
  if (valueType) {
    lines.push(indent(`${inputLine},`, level + 1));
    lines.push(indent(`valueType: ${valueType}`, level + 1));
  } else {
    lines.push(indent(inputLine, level + 1));
  }
  lines.push(indent("}", level));
  return lines.join("\n");
};

const serializeOutput = (output, level) => {
  const segments = [`id: ${quote(output.id)}`, `label: ${quote(output.label)}`];
  if (output.description) {
    segments.push(`description: ${quote(output.description)}`);
  }
  const valueType = serializeValueType(output.valueType);
  if (valueType) {
    segments.push(`valueType: ${valueType}`);
  }
  return `{
${indent(segments.join(",\n"), level + 1)}
${indent("}", level)}`;
};

const serializeEntry = (entry) => {
  const lines = ["{"];
  lines.push(indent(`apiName: ${quote(entry.apiName)},`, 1));
  lines.push(indent(`blockKind: ${quote(entry.blockKind)},`, 1));
  lines.push(indent(`label: ${quote(entry.label)},`, 1));
  lines.push(indent(`category: ${quote(entry.category)},`, 1));
  if (entry.icon) {
    lines.push(indent(`icon: ${quote(entry.icon)},`, 1));
  }
  if (entry.description) {
    lines.push(indent(`description: ${quote(entry.description)},`, 1));
  }
  if (entry.identifierField) {
    lines.push(indent(`identifierField: ${quote(entry.identifierField)},`, 1));
  }

  const fieldsContent = entry.fields.length
    ? `[
${entry.fields.map((field) => indent(serializeField(field, 2), 2)).join(",\n")}
${indent("]", 1)}`
    : "[]";
  lines.push(indent(`fields: ${fieldsContent},`, 1));

  const outputsContent = entry.outputs.length
    ? `[
${entry.outputs.map((output) => indent(serializeOutput(output, 2), 2)).join(",\n")}
${indent("]", 1)}`
    : "[]";
  lines.push(indent(`outputs: ${outputsContent}`, 1));
  lines.push("}");
  return lines.join("\n");
};

const entriesTs = manifest.entries.map((entry) => serializeEntry(entry)).join(",\n");

const fileContents = `// This file is auto-generated by scripts/generate-api-manifest.mjs
import type { ApiManifestEntry } from "./api-manifest-schema";

export const apiManifestEntries: ApiManifestEntry[] = [
${indent(entriesTs, 1)}
];

export const apiManifestByKind = new Map(apiManifestEntries.map((entry) => [entry.blockKind, entry]));
`;

writeFileSync(outputPath, fileContents);
