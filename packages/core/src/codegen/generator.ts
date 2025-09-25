import { parse as babelParse, parseExpression as babelParseExpression } from "@babel/parser";
import type { Expression, Identifier, Statement, VariableDeclaration, SpreadElement } from "@babel/types";
import * as t from "@babel/types";
import { parse as recastParse, print as recastPrint } from "recast";

import type { BlockInstance, WorkflowDocument } from "../types";
import { apiManifestByKind } from "../blocks/config/api-manifest";
import type { ApiFieldDefinition, ApiManifestEntry } from "../blocks/config/api-manifest-schema";

const recastOptions = {
  parser: {
    parse(source: string) {
      return babelParse(source, {
        sourceType: "script",
        plugins: ["topLevelAwait"],
        allowReturnOutsideFunction: true
      });
    }
  }
};

const parserOptions = {
  sourceType: "script" as const,
  plugins: ["topLevelAwait" as const],
  allowReturnOutsideFunction: true
};

const parseExpression = (code: string): Expression => {
  if (code.trim() === "") {
    return t.identifier("undefined");
  }

  try {
    return babelParseExpression(code, parserOptions);
  } catch (error) {
    const ast = babelParse(code, parserOptions);

    const statement = ast.program.body[0];
    if (!statement) {
      return t.identifier("undefined");
    }

    if (statement.type === "ExpressionStatement") {
      return statement.expression;
    }

    if (statement.type === "VariableDeclaration" && statement.declarations[0]?.init) {
      return statement.declarations[0].init as Expression;
    }

    throw new Error(`Unable to parse expression from code: ${code}`);
  }
};

const parseExpressionSafely = (code: string): Expression => {
  try {
    return parseExpression(code);
  } catch {
    return t.stringLiteral(code);
  }
};

const parseCallArguments = (code: string): Array<Expression | SpreadElement> => {
  if (code.trim() === "") {
    return [];
  }

  try {
    const callAst = babelParseExpression(`__fn(${code})`, parserOptions);
    if (t.isCallExpression(callAst)) {
      return callAst.arguments as Array<Expression | SpreadElement>;
    }
  } catch {
    // Fall through to parse each argument individually
  }

  try {
    return [parseExpression(code)];
  } catch {
    return [parseExpressionSafely(code)];
  }
};

type FieldValueSource = "user" | "default" | "fallback";

const apiFieldFallbacks: Record<string, Record<string, string>> = {
  "wait-call": { duration: "1" },
  "press-call": { key: "return" },
  "click-call": { target: "[0, 0]" },
  "scroll-call": { origin: "[0, 0]", direction: '"down"', amount: "3" },
  "type-call": { text: '""' },
  "log-call": { message: '""' },
  "ai-call": { prompt: '""' },
  "open-call": { appName: '""' },
  "open-url-call": { url: '""' },
  "vision-call": { target: "screenshot().image" },
  "file-reader-call": { paths: "[]" }
};

const apiFieldTransformers: Record<string, Record<string, (value: unknown) => Expression | null>> = {
  "press-call": {
    modifiers: (value: unknown) => {
      if (typeof value !== "string") {
        return null;
      }
      const tokens = value
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);
      if (tokens.length === 0) {
        return null;
      }
      return t.arrayExpression(tokens.map((token) => t.stringLiteral(token)));
    }
  }
};

const isStringValueEmpty = (value: unknown): boolean => typeof value === "string" && value.trim() === "";

const determineFieldValue = (
  blockKind: string,
  field: ApiFieldDefinition,
  rawValue: unknown
): { value: unknown; source: FieldValueSource } | null => {
  if (rawValue !== undefined && rawValue !== null && !isStringValueEmpty(rawValue)) {
    return { value: rawValue, source: "user" };
  }

  if (field.defaultValue !== undefined && field.defaultValue !== null) {
    return { value: field.defaultValue, source: "default" };
  }

  const fallback = apiFieldFallbacks[blockKind]?.[field.id];
  if (fallback !== undefined) {
    return { value: fallback, source: "fallback" };
  }

  return null;
};

const createExpressionForField = (
  blockKind: string,
  field: ApiFieldDefinition,
  value: unknown
): Expression | null => {
  const transformer = apiFieldTransformers[blockKind]?.[field.id];
  if (transformer) {
    return transformer(value);
  }

  switch (field.input.kind) {
    case "expression":
    case "code": {
      if (typeof value !== "string") {
        return null;
      }
      if (value.trim() === "") {
        return null;
      }
      return parseExpressionSafely(value);
    }
    case "string": {
      if (typeof value !== "string") {
        return t.stringLiteral(String(value ?? ""));
      }
      return t.stringLiteral(value);
    }
    case "number": {
      if (typeof value === "number" && Number.isFinite(value)) {
        return t.numericLiteral(value);
      }
      if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return t.numericLiteral(parsed);
        }
        return parseExpressionSafely(value);
      }
      return null;
    }
    case "boolean": {
      if (typeof value === "boolean") {
        return t.booleanLiteral(value);
      }
      if (typeof value === "string") {
        const trimmed = value.trim().toLowerCase();
        if (trimmed === "true" || trimmed === "false") {
          return t.booleanLiteral(trimmed === "true");
        }
        return parseExpressionSafely(value);
      }
      return null;
    }
    case "enum": {
      if (typeof value !== "string") {
        return t.stringLiteral(String(value ?? ""));
      }
      return t.stringLiteral(value);
    }
    case "json-schema": {
      return t.stringLiteral(String(value ?? ""));
    }
    case "identifier":
      return null;
    default:
      return parseExpressionSafely(String(value ?? ""));
  }
};

const generateApiCallStatements = (
  block: BlockInstance,
  entry: ApiManifestEntry
): Statement[] | null => {
  const fieldMap = new Map(entry.fields.map((field) => [field.id, field]));
  const identifierField = entry.identifierField;
  const defaultIdentifier = entry.defaultIdentifier;

  const invocation = entry.invocation ?? {
    style: "object" as const,
    arguments: [],
    options: entry.fields.map((field) => field.id)
  };

  const args: Expression[] = [];
  const optionProperties: t.ObjectProperty[] = [];

  const getFieldResult = (fieldId: string): { expression: Expression; source: FieldValueSource } | null => {
    const field = fieldMap.get(fieldId);
    if (!field) {
      return null;
    }
    const raw = (block.data as Record<string, unknown>)[fieldId];
    const determined = determineFieldValue(block.kind, field, raw);
    if (!determined) {
      return null;
    }
    const expression = createExpressionForField(block.kind, field, determined.value);
    if (!expression) {
      return null;
    }
    return { expression, source: determined.source };
  };

  const includeOptionField = (fieldId: string) => {
    if (fieldId === identifierField) {
      return;
    }
    const result = getFieldResult(fieldId);
    if (!result) {
      return;
    }
    if (result.source === "default") {
      return;
    }
    optionProperties.push(
      t.objectProperty(t.identifier(fieldId), result.expression)
    );
  };

  const invocationKind = invocation.style;

  if (invocationKind === "positional" || invocationKind === "positionalWithOptions") {
    invocation.arguments?.forEach((fieldId) => {
      const result = getFieldResult(fieldId);
      if (result) {
        args.push(result.expression);
      }
    });

    if (invocationKind === "positionalWithOptions") {
      invocation.options?.forEach(includeOptionField);
      if (optionProperties.length > 0) {
        args.push(t.objectExpression(optionProperties));
      }
    }
  } else {
    const optionFieldIds = invocation.options && invocation.options.length > 0
      ? invocation.options
      : entry.fields.map((field) => field.id);
    optionFieldIds.forEach(includeOptionField);
    args.push(t.objectExpression(optionProperties));
  }

  const callExpression = t.callExpression(t.identifier(entry.apiName), args);

  const identifierValue = identifierField
    ? (block.data as Record<string, unknown>)[identifierField]
    : undefined;
  const identifierName = typeof identifierValue === "string" && identifierValue.trim().length > 0
    ? identifierValue.trim()
    : defaultIdentifier ?? null;

  if (identifierName) {
    return [t.variableDeclaration("let", [t.variableDeclarator(t.identifier(identifierName), callExpression)])];
  }

  return [t.expressionStatement(callExpression)];
};

const parseStatement = (code: string): Statement => {
  const ast = recastParse(code, recastOptions);
  const statement = ast.program.body[0] as Statement | undefined;
  if (!statement) {
    throw new Error(`Unable to parse statement from code: ${code}`);
  }
  return statement;
};

const parseForInitializer = (code: string): VariableDeclaration | Expression | null => {
  if (code.trim() === "") {
    return null;
  }

  const ast = recastParse(code, recastOptions);
  const first = ast.program.body[0];
  if (!first) {
    return null;
  }

  if (t.isVariableDeclaration(first)) {
    return first as VariableDeclaration;
  }

  if (t.isExpressionStatement(first)) {
    return (first as t.ExpressionStatement).expression;
  }

  throw new Error(`Unsupported for-loop initializer: ${code}`);
};



const updateOperationToBinaryOperator: Record<string, t.BinaryExpression["operator"]> = {
  add: "+",
  subtract: "-",
  multiply: "*",
  divide: "/",
  modulo: "%"
};

const updateOperationToCompoundOperator: Record<string, "+=" | "-=" | "*=" | "/=" | "%="> = {
  add: "+=",
  subtract: "-=",
  multiply: "*=",
  divide: "/=",
  modulo: "%="
};

const parameterIdentifiers = (parameters: string | undefined): Identifier[] => {
  if (!parameters) {
    return [];
  }

  return parameters
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((name) => t.identifier(name));
};

const mathOperatorMap: Record<string, t.BinaryExpression["operator"]> = {
  add: "+",
  subtract: "-",
  multiply: "*",
  divide: "/",
  modulo: "%",
  power: "**"
};

const createAssignmentStatements = ({
  identifier,
  declarationKind,
  expression
}: {
  identifier: string | undefined;
  declarationKind?: string;
  expression: Expression;
}): Statement[] => {
  const targetName = typeof identifier === "string" ? identifier.trim() : "";
  if (!targetName) {
    return [t.expressionStatement(expression)];
  }

  if (declarationKind === "assign") {
    return [
      t.expressionStatement(
        t.assignmentExpression("=", t.identifier(targetName), expression)
      )
    ];
  }

  const variableKind: "const" | "let" = declarationKind === "let" ? "let" : "const";
  return [
    t.variableDeclaration(variableKind, [t.variableDeclarator(t.identifier(targetName), expression)])
  ];
};

const parseExpressionWithFallback = (code: string, fallback: string): Expression => {
  const candidate = typeof code === "string" ? code.trim() : "";
  if (candidate === "") {
    return parseExpression(fallback);
  }
  return parseExpression(candidate);
};

const blockToStatement = ({
  block,
  document
}: {
  block: BlockInstance;
  document: WorkflowDocument;
}): Statement[] => {
  const apiEntry = apiManifestByKind.get(block.kind);
  if (apiEntry) {
    const apiStatements = generateApiCallStatements(block, apiEntry);
    if (apiStatements) {
      return apiStatements;
    }
  }

  switch (block.kind) {
    case "function-declaration": {
      const name = typeof block.data.identifier === "string" ? block.data.identifier : "anonymous";
      const params = parameterIdentifiers(block.data.parameters as string | undefined);
      const bodyBlocks = block.children.body.map((childId) => document.blocks[childId]).filter(Boolean);
      const bodyStatements = bodyBlocks.flatMap((child) => blockToStatement({ block: child, document }));

      const functionBody = t.blockStatement(bodyStatements);
      const declaration = t.functionDeclaration(t.identifier(name), params, functionBody);
      return [declaration];
    }

    case "variable-declaration": {
      const identifier = typeof block.data.identifier === "string" ? block.data.identifier : "result";
      const initializerCode = typeof block.data.initializer === "string" ? block.data.initializer : "";
      const initExpression = initializerCode.trim() === "" ? null : parseExpression(initializerCode);
      const declarator = t.variableDeclarator(t.identifier(identifier), initExpression ?? null);
      const declaration = t.variableDeclaration("let", [declarator]);
      return [declaration];
    }

    case "variable-update": {
      const identifier = typeof block.data.identifier === "string" ? block.data.identifier : "result";
      const operation = typeof block.data.operation === "string" ? block.data.operation : "assign";
      const valueCode = typeof block.data.value === "string" ? block.data.value : "";
      const operatorStyle = typeof block.data.operatorStyle === "string" ? block.data.operatorStyle : null;
      const valueExpression = parseExpression(valueCode);

      if (operation === "assign" || !updateOperationToBinaryOperator[operation]) {
        const assignment = t.assignmentExpression("=", t.identifier(identifier), valueExpression);
        return [t.expressionStatement(assignment)];
      }

      const compoundOperator = updateOperationToCompoundOperator[operation];
      if (compoundOperator && operatorStyle === "compound") {
        const assignment = t.assignmentExpression(compoundOperator, t.identifier(identifier), valueExpression);
        return [t.expressionStatement(assignment)];
      }

      const binaryOperator = updateOperationToBinaryOperator[operation];
      const augmentedExpression = t.binaryExpression(binaryOperator, t.identifier(identifier), valueExpression);
      const assignment = t.assignmentExpression("=", t.identifier(identifier), augmentedExpression);
      return [t.expressionStatement(assignment)];
    }

    case "array-push": {
      const arrayName = typeof block.data.array === "string" ? block.data.array : "items";
      const valueCode = typeof block.data.value === "string" ? block.data.value : "";
      const valueExpression = parseExpression(valueCode);
      const storeResult = Boolean(block.data.storeResult);
      const call = t.callExpression(
        t.memberExpression(t.identifier(arrayName), t.identifier("push")),
        [valueExpression]
      );

      if (storeResult) {
        const assignment = t.assignmentExpression("=", t.identifier(arrayName), call);
        return [t.expressionStatement(assignment)];
      }

      return [t.expressionStatement(call)];
    }

    case "expression-statement": {
      const code = typeof block.data.code === "string" ? block.data.code : "";
      const expression = parseExpression(code);
      return [t.expressionStatement(expression)];
    }

    case "function-call": {
      const functionNameRaw = typeof block.data.functionName === "string" ? block.data.functionName : "call";
      const functionName = functionNameRaw.trim() === "" ? "call" : functionNameRaw.trim();
      const argsCode = typeof block.data.arguments === "string" ? block.data.arguments : "";
      const assignToRaw = typeof block.data.assignTo === "string" ? block.data.assignTo : "";
      const assignTo = assignToRaw.trim() === "" ? null : assignToRaw.trim();

      const callee = parseExpressionSafely(functionName);
      const callArguments = parseCallArguments(argsCode);
      const callExpression = t.callExpression(callee, callArguments);

      if (assignTo) {
        return [t.variableDeclaration("let", [t.variableDeclarator(t.identifier(assignTo), callExpression)])];
      }

      return [t.expressionStatement(callExpression)];
    }

    case "return-statement": {
      const argumentCode = typeof block.data.argument === "string" ? block.data.argument : "";
      const argumentExpression = argumentCode.trim() === "" ? null : parseExpression(argumentCode);
      return [t.returnStatement(argumentExpression)];
    }

    case "if-statement": {
      const testCode = typeof block.data.test === "string" ? block.data.test : "false";
      const testExpression = parseExpression(testCode);

      const consequentBlocks = block.children.consequent.map((id) => document.blocks[id]).filter(Boolean);
      const alternateBlocks = block.children.alternate.map((id) => document.blocks[id]).filter(Boolean);

      const consequentStatements = consequentBlocks.flatMap((child) => blockToStatement({ block: child, document }));
      const alternateStatements = alternateBlocks.flatMap((child) => blockToStatement({ block: child, document }));

      const consequent = t.blockStatement(consequentStatements);
      let alternate: Statement | null = null;
      if (alternateStatements.length === 1 && alternateBlocks.length === 1 && alternateBlocks[0]?.kind === "if-statement") {
        alternate = alternateStatements[0];
      } else if (alternateStatements.length > 0) {
        alternate = t.blockStatement(alternateStatements);
      }

      return [t.ifStatement(testExpression, consequent, alternate)];
    }

    case "while-statement": {
      const testCode = typeof block.data.test === "string" ? block.data.test : "false";
      const testExpression = parseExpression(testCode);

      const bodyBlocks = block.children.body.map((id) => document.blocks[id]).filter(Boolean);
      const bodyStatements = bodyBlocks.flatMap((child) => blockToStatement({ block: child, document }));
      const body = t.blockStatement(bodyStatements);

      return [t.whileStatement(testExpression, body)];
    }

    case "for-statement": {
      const initializerCode = typeof block.data.initializer === "string" ? block.data.initializer : "";
      const testCode = typeof block.data.test === "string" ? block.data.test : "";
      const updateCode = typeof block.data.update === "string" ? block.data.update : "";

      const init = parseForInitializer(initializerCode);
      const test = testCode.trim() === "" ? null : parseExpression(testCode);
      const update = updateCode.trim() === "" ? null : parseExpression(updateCode);

      const bodyBlocks = block.children.body.map((id) => document.blocks[id]).filter(Boolean);
      const bodyStatements = bodyBlocks.flatMap((child) => blockToStatement({ block: child, document }));
      const body = t.blockStatement(bodyStatements);

      return [t.forStatement(init, test, update, body)];
    }

    case "for-of-statement": {
      const declarationKind = typeof block.data.declarationKind === "string" ? block.data.declarationKind : "const";
      const identifierName = typeof block.data.identifier === "string" && block.data.identifier.trim() !== ""
        ? block.data.identifier.trim()
        : "item";
      const iterableCode = typeof block.data.iterable === "string" ? block.data.iterable : "";
      const iterableExpression = parseExpressionWithFallback(iterableCode, "[]");

      const bodyBlocks = block.children.body.map((id) => document.blocks[id]).filter(Boolean);
      const bodyStatements = bodyBlocks.flatMap((child) => blockToStatement({ block: child, document }));
      const body = t.blockStatement(bodyStatements);

      if (declarationKind === "assign") {
        return [t.forOfStatement(t.identifier(identifierName), iterableExpression, body, false)];
      }

      return [
        t.forOfStatement(
          t.variableDeclaration(declarationKind === "let" ? "let" : "const", [t.variableDeclarator(t.identifier(identifierName))]),
          iterableExpression,
          body,
          false
        )
      ];
    }

    case "for-in-statement": {
      const declarationKind = typeof block.data.declarationKind === "string" ? block.data.declarationKind : "const";
      const identifierName = typeof block.data.identifier === "string" && block.data.identifier.trim() !== ""
        ? block.data.identifier.trim()
        : "key";
      const sourceCode = typeof block.data.source === "string" ? block.data.source : "";
      const sourceExpression = parseExpressionWithFallback(sourceCode, "{}");

      const bodyBlocks = block.children.body.map((id) => document.blocks[id]).filter(Boolean);
      const bodyStatements = bodyBlocks.flatMap((child) => blockToStatement({ block: child, document }));
      const body = t.blockStatement(bodyStatements);

      if (declarationKind === "assign") {
        return [t.forInStatement(t.identifier(identifierName), sourceExpression, body)];
      }

      return [
        t.forInStatement(
          t.variableDeclaration(declarationKind === "let" ? "let" : "const", [t.variableDeclarator(t.identifier(identifierName))]),
          sourceExpression,
          body
        )
      ];
    }

    case "do-while-statement": {
      const testCode = typeof block.data.test === "string" ? block.data.test : "";
      const testExpression = parseExpressionWithFallback(testCode, "false");

      const bodyBlocks = block.children.body.map((id) => document.blocks[id]).filter(Boolean);
      const bodyStatements = bodyBlocks.flatMap((child) => blockToStatement({ block: child, document }));
      const body = t.blockStatement(bodyStatements);

      return [t.doWhileStatement(testExpression, body)];
    }

    case "array-for-each": {
      const arrayCode = typeof block.data.array === "string" ? block.data.array : "";
      const arrayExpression = parseExpressionWithFallback(arrayCode, "[]");
      const itemIdentifier = typeof block.data.itemIdentifier === "string" && block.data.itemIdentifier.trim() !== ""
        ? block.data.itemIdentifier.trim()
        : "item";
      const indexIdentifier = typeof block.data.indexIdentifier === "string" && block.data.indexIdentifier.trim() !== ""
        ? block.data.indexIdentifier.trim()
        : "";

      const params: Identifier[] = [t.identifier(itemIdentifier)];
      if (indexIdentifier) {
        params.push(t.identifier(indexIdentifier));
      }

      const bodyBlocks = block.children.body.map((id) => document.blocks[id]).filter(Boolean);
      const bodyStatements = bodyBlocks.flatMap((child) => blockToStatement({ block: child, document }));
      const callback = t.arrowFunctionExpression(params, t.blockStatement(bodyStatements));
      const callExpression = t.callExpression(
        t.memberExpression(arrayExpression, t.identifier("forEach")),
        [callback]
      );

      return [t.expressionStatement(callExpression)];
    }

    case "array-map": {
      const arrayCode = typeof block.data.array === "string" ? block.data.array : "";
      const arrayExpression = parseExpressionWithFallback(arrayCode, "[]");
      const itemIdentifier = typeof block.data.itemIdentifier === "string" && block.data.itemIdentifier.trim() !== ""
        ? block.data.itemIdentifier.trim()
        : "item";
      const indexIdentifier = typeof block.data.indexIdentifier === "string" && block.data.indexIdentifier.trim() !== ""
        ? block.data.indexIdentifier.trim()
        : "";

      const params: Identifier[] = [t.identifier(itemIdentifier)];
      if (indexIdentifier) {
        params.push(t.identifier(indexIdentifier));
      }

      const bodyBlocks = block.children.body.map((id) => document.blocks[id]).filter(Boolean);
      const bodyStatements = bodyBlocks.flatMap((child) => blockToStatement({ block: child, document }));
      const callback = t.arrowFunctionExpression(params, t.blockStatement(bodyStatements));
      const callExpression = t.callExpression(
        t.memberExpression(arrayExpression, t.identifier("map")),
        [callback]
      );

      return createAssignmentStatements({
        identifier: typeof block.data.target === "string" ? block.data.target : undefined,
        declarationKind: typeof block.data.declarationKind === "string" ? block.data.declarationKind : "const",
        expression: callExpression
      });
    }

    case "array-filter": {
      const arrayCode = typeof block.data.array === "string" ? block.data.array : "";
      const arrayExpression = parseExpressionWithFallback(arrayCode, "[]");
      const itemIdentifier = typeof block.data.itemIdentifier === "string" && block.data.itemIdentifier.trim() !== ""
        ? block.data.itemIdentifier.trim()
        : "item";
      const indexIdentifier = typeof block.data.indexIdentifier === "string" && block.data.indexIdentifier.trim() !== ""
        ? block.data.indexIdentifier.trim()
        : "";

      const params: Identifier[] = [t.identifier(itemIdentifier)];
      if (indexIdentifier) {
        params.push(t.identifier(indexIdentifier));
      }

      const bodyBlocks = block.children.body.map((id) => document.blocks[id]).filter(Boolean);
      const bodyStatements = bodyBlocks.flatMap((child) => blockToStatement({ block: child, document }));
      const callback = t.arrowFunctionExpression(params, t.blockStatement(bodyStatements));
      const callExpression = t.callExpression(
        t.memberExpression(arrayExpression, t.identifier("filter")),
        [callback]
      );

      return createAssignmentStatements({
        identifier: typeof block.data.target === "string" ? block.data.target : undefined,
        declarationKind: typeof block.data.declarationKind === "string" ? block.data.declarationKind : "const",
        expression: callExpression
      });
    }

    case "math-operation": {
      const leftCode = typeof block.data.left === "string" ? block.data.left : "";
      const rightCode = typeof block.data.right === "string" ? block.data.right : "";
      const operatorKey = typeof block.data.operator === "string" ? block.data.operator : "add";
      const operator = mathOperatorMap[operatorKey] ?? "+";

      const leftExpression = parseExpressionWithFallback(leftCode, "0");
      const rightExpression = parseExpressionWithFallback(rightCode, "0");
      const expression = t.binaryExpression(operator, leftExpression, rightExpression);

      return createAssignmentStatements({
        identifier: typeof block.data.target === "string" ? block.data.target : undefined,
        declarationKind: typeof block.data.declarationKind === "string" ? block.data.declarationKind : "const",
        expression
      });
    }

    case "string-operation": {
      const sourceCode = typeof block.data.source === "string" ? block.data.source : "";
      const operation = typeof block.data.operation === "string" ? block.data.operation : "toUpperCase";
      const argOneCode = typeof block.data.argument === "string" ? block.data.argument : "";
      const argTwoCode = typeof block.data.argumentTwo === "string" ? block.data.argumentTwo : "";

      const sourceExpression = parseExpressionWithFallback(sourceCode, '""');

      let expression: Expression;
      switch (operation) {
        case "concat": {
          const rightExpression = parseExpressionWithFallback(argOneCode, '""');
          expression = t.binaryExpression("+", sourceExpression, rightExpression);
          break;
        }
        case "includes":
        case "startsWith":
        case "endsWith": {
          const args = [parseExpressionWithFallback(argOneCode, '""')];
          if (argTwoCode.trim() !== "") {
            args.push(parseExpression(argTwoCode));
          }
          expression = t.callExpression(
            t.memberExpression(sourceExpression, t.identifier(operation)),
            args
          );
          break;
        }
        case "slice":
        case "substring": {
          const args: Expression[] = [];
          if (argOneCode.trim() !== "") {
            args.push(parseExpression(argOneCode));
          }
          if (argTwoCode.trim() !== "") {
            args.push(parseExpression(argTwoCode));
          }
          expression = t.callExpression(
            t.memberExpression(sourceExpression, t.identifier(operation)),
            args
          );
          break;
        }
        case "replace": {
          const searchExpression = parseExpressionWithFallback(argOneCode, '""');
          const replacementExpression = parseExpressionWithFallback(argTwoCode, '""');
          expression = t.callExpression(
            t.memberExpression(sourceExpression, t.identifier("replace")),
            [searchExpression, replacementExpression]
          );
          break;
        }
        case "padStart":
        case "padEnd": {
          const targetLength = parseExpressionWithFallback(argOneCode, "0");
          const fillString = argTwoCode.trim() === "" ? null : parseExpression(argTwoCode);
          const args: Expression[] = [targetLength];
          if (fillString) {
            args.push(fillString);
          }
          expression = t.callExpression(
            t.memberExpression(sourceExpression, t.identifier(operation)),
            args
          );
          break;
        }
        case "toLowerCase":
        case "toUpperCase":
        case "trim":
        default: {
          expression = t.callExpression(
            t.memberExpression(sourceExpression, t.identifier(operation)),
            []
          );
          break;
        }
      }

      return createAssignmentStatements({
        identifier: typeof block.data.target === "string" ? block.data.target : undefined,
        declarationKind: typeof block.data.declarationKind === "string" ? block.data.declarationKind : "const",
        expression
      });
    }

    case "break-statement": {
      return [t.breakStatement()];
    }

    case "throw-statement": {
      const argumentCode = typeof block.data.argument === "string" ? block.data.argument : "";
      const argument = parseExpression(argumentCode);
      return [t.throwStatement(argument)];
    }

    case "switch-statement": {
      const discriminantCode = typeof block.data.discriminant === "string" ? block.data.discriminant : "";
      const discriminant = parseExpression(discriminantCode);

      const caseBlocks = block.children.cases.map((id) => document.blocks[id]).filter(Boolean);

      const switchCases = caseBlocks.map((caseBlock) => {
        const isDefault = Boolean(caseBlock.data.isDefault);
        const testCode = typeof caseBlock.data.test === "string" ? caseBlock.data.test : "";
        const testExpression = isDefault || testCode.trim() === "" ? null : parseExpression(testCode);

        const consequentBlocks = caseBlock.children.body.map((id) => document.blocks[id]).filter(Boolean);
        const consequentStatements = consequentBlocks.flatMap((child) => blockToStatement({ block: child, document }));

        return t.switchCase(testExpression, consequentStatements);
      });

      return [t.switchStatement(discriminant, switchCases)];
    }

    case "try-statement": {
      const tryBlocks = block.children["try"].map((id) => document.blocks[id]).filter(Boolean);
      const tryStatements = tryBlocks.flatMap((child) => blockToStatement({ block: child, document }));
      const blockStatement = t.blockStatement(tryStatements);

      const catchIds = block.children["catch"];
      let handler: t.CatchClause | null = null;
      if (catchIds.length > 0) {
        const catchBlock = document.blocks[catchIds[0]];
        if (!catchBlock) {
          throw new Error("Missing catch block instance");
        }

        const paramCode = typeof catchBlock.data.param === "string" ? catchBlock.data.param.trim() : "";
        const param = paramCode === "" ? null : t.identifier(paramCode);

        const catchBodyBlocks = catchBlock.children.body.map((id) => document.blocks[id]).filter(Boolean);
        const catchStatements = catchBodyBlocks.flatMap((child) => blockToStatement({ block: child, document }));
        handler = t.catchClause(param, t.blockStatement(catchStatements));
      }

      const finallyBlocks = block.children["finally"].map((id) => document.blocks[id]).filter(Boolean);
      const finallyStatements = finallyBlocks.flatMap((child) => blockToStatement({ block: child, document }));
      const finalizer = finallyStatements.length > 0 ? t.blockStatement(finallyStatements) : null;

      return [t.tryStatement(blockStatement, handler, finalizer)];
    }

    case "raw-statement": {
      const code = typeof block.data.code === "string" ? block.data.code : "";
      return [parseStatement(code)];
    }

    default:
      throw new Error(`Unhandled block kind in code generation: ${block.kind}`);
  }
};

export const generateCode = (document: WorkflowDocument): string => {
  const root = document.blocks[document.root];
  if (!root) {
    throw new Error("Document missing root block");
  }

  const statements = root.children.body
    .map((id) => document.blocks[id])
    .filter((block): block is BlockInstance => Boolean(block))
    .flatMap((block) => blockToStatement({ block, document }));

  const program = t.program(statements);
  const file = t.file(program);

  return recastPrint(file, { reuseWhitespace: false }).code;
};
