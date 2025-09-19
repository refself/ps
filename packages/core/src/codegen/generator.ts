import { parse as babelParse, parseExpression as babelParseExpression } from "@babel/parser";
import type { Expression, Identifier, Statement, VariableDeclaration, SpreadElement } from "@babel/types";
import * as t from "@babel/types";
import { parse as recastParse, print as recastPrint } from "recast";

import type { BlockInstance, WorkflowDocument } from "../types";

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

const parseCallArguments = (code: string): Array<Expression | SpreadElement> => {
  if (!code || code.trim() === "") {
    return [];
  }

  try {
    const wrapped = `[${code}]`;
    const parsed = babelParseExpression(wrapped, parserOptions);
    if (t.isArrayExpression(parsed)) {
      return parsed.elements
        .map((element) => {
          if (!element) {
            return null;
          }
          if (t.isSpreadElement(element)) {
            return element;
          }
          if (t.isExpression(element)) {
            return element as Expression;
          }
          return parseExpression(recastPrint(element).code);
        })
        .filter((el): el is Expression | SpreadElement => Boolean(el));
    }
  } catch (error) {
    // fall through to string literal fallback
  }

  return [parseExpression(code)];
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

const blockToStatement = ({
  block,
  document
}: {
  block: BlockInstance;
  document: WorkflowDocument;
}): Statement[] => {
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

    case "expression-statement": {
      const code = typeof block.data.code === "string" ? block.data.code : "";
      const expression = parseExpression(code);
      return [t.expressionStatement(expression)];
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

    case "wait-call": {
      const duration = Number(block.data.duration ?? 1);
      const durationLiteral = Number.isFinite(duration) ? t.numericLiteral(duration) : parseExpression(String(block.data.duration ?? 1));
      return [t.expressionStatement(t.callExpression(t.identifier("wait"), [durationLiteral]))];
    }

    case "press-call": {
      const key = typeof block.data.key === "string" ? block.data.key : "return";
      const modifiersRaw = typeof block.data.modifiers === "string" ? block.data.modifiers : "";
      const args: Expression[] = [t.stringLiteral(key)];
      const modifierTokens = modifiersRaw
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);
      if (modifierTokens.length > 0) {
        args.push(t.arrayExpression(modifierTokens.map((token) => t.stringLiteral(token))));
      }
      return [t.expressionStatement(t.callExpression(t.identifier("press"), args))];
    }

    case "click-call": {
      const targetCode = typeof block.data.target === "string" && block.data.target.trim() !== "" ? block.data.target : "[0, 0]";
      const targetExpression = parseExpression(targetCode);
      return [t.expressionStatement(t.callExpression(t.identifier("click"), [targetExpression]))];
    }

    case "type-call": {
      const rawText = typeof block.data.text === "string" ? block.data.text.trim() : "";
      const candidate = rawText.length > 0 ? rawText : "\"\"";
      let expression: t.Expression;
      try {
        expression = parseExpression(candidate);
      } catch {
        expression = parseExpression(JSON.stringify(rawText));
      }
      return [t.expressionStatement(t.callExpression(t.identifier("type"), [expression]))];
    }

    case "log-call": {
      const messageExpression = typeof block.data.message === "string" ? block.data.message : "";
      const expression = parseExpression(messageExpression);
      return [t.expressionStatement(t.callExpression(t.identifier("log"), [expression]))];
    }

    case "function-call": {
      const functionName =
        typeof block.data.functionName === "string" && block.data.functionName.trim() !== ""
          ? block.data.functionName.trim()
          : "call";
      const argsCode = typeof block.data.arguments === "string" ? block.data.arguments : "";
      const args = parseCallArguments(argsCode);
      const call = t.callExpression(t.identifier(functionName), args);
      const assignTo =
        typeof block.data.assignTo === "string" && block.data.assignTo.trim() !== ""
          ? block.data.assignTo.trim()
          : null;
      if (assignTo) {
        return [t.variableDeclaration("let", [t.variableDeclarator(t.identifier(assignTo), call)])];
      }
      return [t.expressionStatement(call)];
    }

    case "open-call": {
      const appName = typeof block.data.appName === "string" ? block.data.appName : "";
      const bringToFront = typeof block.data.bringToFront === "boolean" ? block.data.bringToFront : true;
      const waitSecondsRaw = block.data.waitSeconds;
      const waitSeconds = typeof waitSecondsRaw === "number" && Number.isFinite(waitSecondsRaw) ? waitSecondsRaw : 5;
      const args: Expression[] = [t.stringLiteral(appName)];
      if (bringToFront !== undefined) {
        args.push(t.booleanLiteral(bringToFront));
      }
      if (waitSeconds !== undefined) {
        args.push(t.numericLiteral(waitSeconds));
      }
      const call = t.callExpression(t.identifier("open"), args);
      const identifier = typeof block.data.identifier === "string" && block.data.identifier.trim() !== "" ? block.data.identifier : null;
      if (identifier) {
        return [t.variableDeclaration("let", [t.variableDeclarator(t.identifier(identifier), call)])];
      }
      return [t.expressionStatement(call)];
    }

    case "open-url-call": {
      const url = typeof block.data.url === "string" ? block.data.url : "";
      return [t.expressionStatement(t.callExpression(t.identifier("openUrl"), [t.stringLiteral(url)]))];
    }

    case "ai-call": {
      const identifier = typeof block.data.identifier === "string" ? block.data.identifier : "result";
      const prompt = typeof block.data.prompt === "string" ? block.data.prompt : "";
      const format = typeof block.data.format === "string" ? block.data.format : "text";
      const schemaCode = typeof block.data.schema === "string" ? block.data.schema : "";

      const args: Expression[] = [t.stringLiteral(prompt)];
      const properties: t.ObjectProperty[] = [];

      if (format && format !== "text") {
        properties.push(t.objectProperty(t.identifier("format"), t.stringLiteral(format)));
      }

      if (schemaCode.trim()) {
        try {
          properties.push(t.objectProperty(t.identifier("schema"), parseExpression(schemaCode)));
        } catch (error) {
          properties.push(t.objectProperty(t.identifier("schema"), t.stringLiteral(schemaCode)));
        }
      }

      if (properties.length > 0) {
        args.push(t.objectExpression(properties));
      }

      const callExpression = t.callExpression(t.identifier("ai"), args);
      const declaration = t.variableDeclaration("let", [t.variableDeclarator(t.identifier(identifier), callExpression)]);
      return [declaration];
    }

    case "locator-call": {
      const identifier = typeof block.data.identifier === "string" ? block.data.identifier : "node";
      const rawInstruction = typeof block.data.instruction === "string" ? block.data.instruction.trim() : "";
      const element = typeof block.data.element === "string" ? block.data.element : "";
      const waitTimeData = block.data.waitTime;

      const properties: t.ObjectProperty[] = [];
      if (rawInstruction.length > 0) {
        let instructionExpression: Expression;
        try {
          instructionExpression = parseExpression(rawInstruction);
        } catch {
          instructionExpression = t.stringLiteral(rawInstruction);
        }
        properties.push(t.objectProperty(t.identifier("instruction"), instructionExpression));
      }
      if (element) {
        properties.push(t.objectProperty(t.identifier("element"), t.stringLiteral(element)));
      }
      if (typeof waitTimeData === "number" && Number.isFinite(waitTimeData)) {
        properties.push(t.objectProperty(t.identifier("waitTime"), t.numericLiteral(waitTimeData)));
      } else if (typeof waitTimeData === "string" && waitTimeData.trim() !== "") {
        try {
          properties.push(t.objectProperty(t.identifier("waitTime"), parseExpression(waitTimeData)));
        } catch (error) {
          const parsed = Number(waitTimeData);
          if (Number.isFinite(parsed)) {
            properties.push(t.objectProperty(t.identifier("waitTime"), t.numericLiteral(parsed)));
          }
        }
      }

      const locatorArgs: Expression[] = [];
      if (properties.length > 0) {
        locatorArgs.push(t.objectExpression(properties));
      }

      const callExpression = t.callExpression(t.identifier("locator"), locatorArgs);
      const declaration = t.variableDeclaration("let", [t.variableDeclarator(t.identifier(identifier), callExpression)]);
      return [declaration];
    }

    case "vision-call": {
      const identifier = typeof block.data.identifier === "string" ? block.data.identifier : "visionResult";
      const targetCode = typeof block.data.target === "string" ? block.data.target : "";
      const targetExpression = parseExpression(targetCode || "screenshot().image");
      const prompt = typeof block.data.prompt === "string" ? block.data.prompt : "";
      const format = typeof block.data.format === "string" ? block.data.format : "json";
      const schemaCode = typeof block.data.schema === "string" ? block.data.schema : "";

      const args: Expression[] = [targetExpression, t.stringLiteral(prompt)];
      const properties: t.ObjectProperty[] = [];

      if (format) {
        properties.push(t.objectProperty(t.identifier("format"), t.stringLiteral(format)));
      }

      if (schemaCode.trim()) {
        try {
          properties.push(t.objectProperty(t.identifier("schema"), parseExpression(schemaCode)));
        } catch (error) {
          properties.push(t.objectProperty(t.identifier("schema"), t.stringLiteral(schemaCode)));
        }
      }

      if (properties.length > 0) {
        args.push(t.objectExpression(properties));
      }

      const callExpression = t.callExpression(t.identifier("vision"), args);
      const declaration = t.variableDeclaration("let", [t.variableDeclarator(t.identifier(identifier), callExpression)]);
      return [declaration];
    }

    case "screenshot-call": {
      const assignTo =
        typeof block.data.assignTo === "string" && block.data.assignTo.trim() !== ""
          ? block.data.assignTo.trim()
          : null;
      const targetCode = typeof block.data.target === "string" ? block.data.target.trim() : "";
      const args: Expression[] = targetCode ? [parseExpression(targetCode)] : [];
      const call = t.callExpression(t.identifier("screenshot"), args);
      if (assignTo) {
        return [t.variableDeclaration("let", [t.variableDeclarator(t.identifier(assignTo), call)])];
      }
      return [t.expressionStatement(call)];
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
