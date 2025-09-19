import { parse as babelParse } from "@babel/parser";
import type {
  CatchClause,
  ExpressionStatement,
  File,
  ForStatement,
  FunctionDeclaration,
  IfStatement,
  Identifier,
  Node,
  ReturnStatement,
  Statement,
  SwitchCase,
  SwitchStatement,
  ThrowStatement,
  TryStatement,
  VariableDeclaration,
  WhileStatement
} from "@babel/types";
import { parse as recastParse, print as recastPrint, types as recastTypes } from "recast";

import { createBlockInstance, createDocument } from "../graph";
import type { BlockInstance, WorkflowDocument } from "../types";

const { namedTypes: n } = recastTypes;

const recastOptions = {
  parser: {
    parse(source: string) {
      return babelParse(source, {
        sourceType: "script",
        plugins: ["topLevelAwait"],
        allowReturnOutsideFunction: true,
        ranges: true,
        tokens: true
      }) as unknown as File;
    }
  }
};

const sourceFor = (node: Node | null | undefined) => {
  if (!node) {
    return "";
  }
  return recastPrint(node).code;
};

const attachMetadata = (block: BlockInstance, node: Node) => {
  const enrichedNode = node as Node & {
    loc?: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
    leadingComments?: Array<{ value: string }>;
  };

  if (enrichedNode.loc) {
    block.metadata = {
      ...block.metadata,
      sourceLocation: {
        start: enrichedNode.loc.start,
        end: enrichedNode.loc.end
      }
    };
  }

  if (enrichedNode.leadingComments && enrichedNode.leadingComments.length > 0) {
    block.metadata = {
      ...block.metadata,
      comments: enrichedNode.leadingComments.map((comment) => comment.value.trim())
    };
  }
};

const createRawStatement = (statement: Statement, blocks: BlockInstance[]) => {
  const block = createBlockInstance("raw-statement", {
    code: sourceFor(statement)
  });
  attachMetadata(block, statement);
  blocks.push(block);
  return block;
};

const stringLiteralValue = (node: Node | null | undefined): string | null => {
  if (!node) {
    return null;
  }
  if (n.StringLiteral.check(node)) {
    return node.value;
  }
  if (n.TemplateLiteral.check(node) && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? null;
  }
  return null;
};

const numberLiteralValue = (node: Node | null | undefined): number | null => {
  if (!node) {
    return null;
  }
  if (n.NumericLiteral.check(node)) {
    return node.value;
  }
  return null;
};

const convertStatement = (statement: Statement, blocks: BlockInstance[]): BlockInstance => {
  const createFunctionCallBlock = ({
    assignTo,
    functionName,
    args
  }: {
    assignTo?: string;
    functionName: string;
    args: Node[];
  }) => {
    const argCode = args
      .map((arg) => sourceFor(arg))
      .join(", ");
    const block = createBlockInstance("function-call", {
      assignTo,
      functionName,
      arguments: argCode
    });
    return block;
  };

  if (n.FunctionDeclaration.check(statement)) {
    const functionNode = statement as FunctionDeclaration;
    const identifier = functionNode.id?.name ?? "anonymous";
    const parameters = functionNode.params.map((param) => sourceFor(param)).join(", ");

    const block = createBlockInstance("function-declaration", {
      identifier,
      parameters
    });
    attachMetadata(block, functionNode);

    const bodySlot = block.children.body;
    functionNode.body.body.forEach((child) => {
      const childBlock = convertStatement(child, blocks);
      bodySlot.push(childBlock.id);
    });

    blocks.push(block);
    return block;
  }

  if (n.VariableDeclaration.check(statement)) {
    const declarationNode = statement as VariableDeclaration;
    if (declarationNode.kind !== "let" || declarationNode.declarations.length !== 1) {
      return createRawStatement(declarationNode, blocks);
    }

    const declarator = declarationNode.declarations[0];
    if (!n.Identifier.check(declarator.id)) {
      return createRawStatement(declarationNode, blocks);
    }

    if (declarator.init && n.CallExpression.check(declarator.init) && n.Identifier.check(declarator.init.callee)) {
      const calleeName = declarator.init.callee.name;

      if (calleeName === "ai") {
        const promptArg = declarator.init.arguments[0];
        const prompt = promptArg ? stringLiteralValue(promptArg) ?? sourceFor(promptArg) : "";

        let format = "text";
        let schema = "";
        const optionsArg = declarator.init.arguments[1];
        if (optionsArg && n.ObjectExpression.check(optionsArg)) {
          optionsArg.properties.forEach((property) => {
            if (n.ObjectProperty.check(property) && n.Identifier.check(property.key)) {
              if (property.key.name === "format") {
                const formatValue = stringLiteralValue(property.value);
                if (formatValue) {
                  format = formatValue;
                }
              }
              if (property.key.name === "schema") {
                schema = sourceFor(property.value);
              }
            }
          });
        }

        const block = createBlockInstance("ai-call", {
          identifier: declarator.id.name,
          prompt,
          format,
          schema
        });
        attachMetadata(block, declarationNode);
        blocks.push(block);
        return block;
      }

      if (calleeName === "locator") {
        const optionsArg = declarator.init.arguments[0];
        let instruction = "";
        let element = "";
        let waitTime: number | string = "";

        if (optionsArg && n.ObjectExpression.check(optionsArg)) {
          optionsArg.properties.forEach((property) => {
            if (n.ObjectProperty.check(property) && n.Identifier.check(property.key)) {
              if (property.key.name === "instruction") {
                instruction = stringLiteralValue(property.value) ?? sourceFor(property.value);
              }
              if (property.key.name === "element") {
                element = stringLiteralValue(property.value) ?? sourceFor(property.value);
              }
              if (property.key.name === "waitTime") {
                const waitNumeric = numberLiteralValue(property.value);
                waitTime = waitNumeric ?? sourceFor(property.value);
              }
            }
          });
        }

        const block = createBlockInstance("locator-call", {
          identifier: declarator.id.name,
          instruction,
          element,
          waitTime
        });
        attachMetadata(block, declarationNode);
        blocks.push(block);
        return block;
      }

      if (calleeName === "open") {
        const args = declarator.init.arguments;
        const appName = args[0] ? stringLiteralValue(args[0]) ?? sourceFor(args[0]) : "";
        const bringToFrontArg = args[1];
        const waitArg = args[2];

        const bringToFront =
          bringToFrontArg && n.BooleanLiteral.check(bringToFrontArg)
            ? bringToFrontArg.value
            : bringToFrontArg
            ? bringToFrontArg.type === "Identifier" && bringToFrontArg.name === "true"
              ? true
              : bringToFrontArg.type === "Identifier" && bringToFrontArg.name === "false"
              ? false
              : true
            : true;

        const waitSeconds = waitArg ? numberLiteralValue(waitArg) ?? Number(sourceFor(waitArg)) : 5;

        const block = createBlockInstance("open-call", {
          identifier: declarator.id.name,
          appName,
          bringToFront,
          waitSeconds: Number.isFinite(waitSeconds) ? waitSeconds : 5
        });
        attachMetadata(block, declarationNode);
        blocks.push(block);
        return block;
      }

      if (calleeName === "vision") {
        const args = declarator.init.arguments;
        const target = args[0] ? sourceFor(args[0]) : "";
        const prompt = args[1] ? stringLiteralValue(args[1]) ?? sourceFor(args[1]) : "";
        let format = "json";
        let schema = "";

        const optionsArg = args[2];
        if (optionsArg && n.ObjectExpression.check(optionsArg)) {
          optionsArg.properties.forEach((property) => {
            if (n.ObjectProperty.check(property) && n.Identifier.check(property.key)) {
              if (property.key.name === "format") {
                const formatValue = stringLiteralValue(property.value);
                if (formatValue) {
                  format = formatValue;
                }
              }
              if (property.key.name === "schema") {
                schema = sourceFor(property.value);
              }
            }
          });
        }

        const block = createBlockInstance("vision-call", {
          identifier: declarator.id.name,
          target,
          prompt,
          format,
          schema
        });
        attachMetadata(block, declarationNode);
        blocks.push(block);
        return block;
      }

      if (calleeName === "screenshot") {
        const args = declarator.init.arguments;
        const targetArg = args[0] ? sourceFor(args[0]) : "";
        const block = createBlockInstance("screenshot-call", {
          assignTo: declarator.id.name,
          target: targetArg
        });
        attachMetadata(block, declarationNode);
        blocks.push(block);
        return block;
      }

      const functionCallBlock = createFunctionCallBlock({
        assignTo: declarator.id.name,
        functionName: calleeName,
        args: declarator.init.arguments
      });
      attachMetadata(functionCallBlock, declarationNode);
      blocks.push(functionCallBlock);
      return functionCallBlock;
    }

    const initializer = declarator.init ? sourceFor(declarator.init) : "";
    const block = createBlockInstance("variable-declaration", {
      identifier: declarator.id.name,
      initializer
    });
    attachMetadata(block, declarationNode);
    blocks.push(block);
    return block;
  }

  if (n.ExpressionStatement.check(statement)) {
    const expressionNode = statement as ExpressionStatement;
    if (n.CallExpression.check(expressionNode.expression) && n.Identifier.check(expressionNode.expression.callee)) {
      const call = expressionNode.expression;
      const callee = call.callee as Identifier;

      if (callee.name === "wait") {
        const durationValue = call.arguments[0]
          ? numberLiteralValue(call.arguments[0]) ?? Number(sourceFor(call.arguments[0]))
          : 1;
        const block = createBlockInstance("wait-call", {
          duration: Number.isFinite(durationValue) ? durationValue : 1
        });
        attachMetadata(block, expressionNode);
        blocks.push(block);
        return block;
      }

      if (callee.name === "press") {
        const keyValue = call.arguments[0] ? stringLiteralValue(call.arguments[0]) ?? sourceFor(call.arguments[0]) : "return";
        let modifiers = "";
        const modifiersArg = call.arguments[1];
        if (modifiersArg) {
          if (n.ArrayExpression.check(modifiersArg)) {
            const entries = modifiersArg.elements
              .map((element) => (element ? stringLiteralValue(element as Node) ?? sourceFor(element as Node) : ""))
              .filter(Boolean);
            modifiers = entries.join(", ");
          } else {
            modifiers = sourceFor(modifiersArg);
          }
        }
        const block = createBlockInstance("press-call", {
          key: keyValue,
          modifiers
        });
        attachMetadata(block, expressionNode);
        blocks.push(block);
        return block;
      }

      if (callee.name === "click") {
        const targetExpression = call.arguments[0] ? sourceFor(call.arguments[0]) : "[0, 0]";
        const block = createBlockInstance("click-call", {
          target: targetExpression
        });
        attachMetadata(block, expressionNode);
        blocks.push(block);
        return block;
      }

      if (callee.name === "type") {
        const textValue = call.arguments[0] ? stringLiteralValue(call.arguments[0]) ?? sourceFor(call.arguments[0]) : "";
        const block = createBlockInstance("type-call", {
          text: textValue
        });
        attachMetadata(block, expressionNode);
        blocks.push(block);
        return block;
      }

      if (callee.name === "log") {
        const messageExpression = call.arguments[0] ? sourceFor(call.arguments[0]) : "";
        const block = createBlockInstance("log-call", {
          message: messageExpression
        });
        attachMetadata(block, expressionNode);
        blocks.push(block);
        return block;
      }

      if (callee.name === "open") {
        const args = call.arguments;
        const appName = args[0] ? stringLiteralValue(args[0]) ?? sourceFor(args[0]) : "";
        const bringToFrontArg = args[1];
        const waitArg = args[2];

        const bringToFront =
          bringToFrontArg && n.BooleanLiteral.check(bringToFrontArg)
            ? bringToFrontArg.value
            : bringToFrontArg
            ? bringToFrontArg.type === "Identifier" && bringToFrontArg.name === "true"
              ? true
              : bringToFrontArg.type === "Identifier" && bringToFrontArg.name === "false"
              ? false
              : true
            : true;

        const waitSeconds = waitArg ? numberLiteralValue(waitArg) ?? Number(sourceFor(waitArg)) : 5;

        const block = createBlockInstance("open-call", {
          appName,
          bringToFront,
          waitSeconds: Number.isFinite(waitSeconds) ? waitSeconds : 5
        });
        attachMetadata(block, expressionNode);
        blocks.push(block);
        return block;
      }

      if (callee.name === "openUrl") {
        const url = call.arguments[0] ? stringLiteralValue(call.arguments[0]) ?? sourceFor(call.arguments[0]) : "";
        const block = createBlockInstance("open-url-call", {
          url
        });
        attachMetadata(block, expressionNode);
        blocks.push(block);
        return block;
      }

      if (callee.name === "vision") {
        const args = call.arguments;
        const target = args[0] ? sourceFor(args[0]) : "";
        const prompt = args[1] ? stringLiteralValue(args[1]) ?? sourceFor(args[1]) : "";
        let format = "json";
        let schema = "";

        const optionsArg = args[2];
        if (optionsArg && n.ObjectExpression.check(optionsArg)) {
          optionsArg.properties.forEach((property) => {
            if (n.ObjectProperty.check(property) && n.Identifier.check(property.key)) {
              if (property.key.name === "format") {
                const formatValue = stringLiteralValue(property.value);
                if (formatValue) {
                  format = formatValue;
                }
              }
              if (property.key.name === "schema") {
                schema = sourceFor(property.value);
              }
            }
          });
        }

        const block = createBlockInstance("vision-call", {
          target,
          prompt,
          format,
          schema
        });
        attachMetadata(block, expressionNode);
        blocks.push(block);
        return block;
      }

      if (callee.name === "screenshot") {
        const target = call.arguments[0] ? sourceFor(call.arguments[0]) : "";
        const block = createBlockInstance("screenshot-call", {
          target
        });
        attachMetadata(block, expressionNode);
        blocks.push(block);
        return block;
      }

      const genericCallBlock = createFunctionCallBlock({
        functionName: callee.name,
        args: call.arguments
      });
      attachMetadata(genericCallBlock, expressionNode);
      blocks.push(genericCallBlock);
      return genericCallBlock;
    }

    const block = createBlockInstance("expression-statement", {
      code: sourceFor(expressionNode.expression)
    });
    attachMetadata(block, expressionNode);
    blocks.push(block);
    return block;
  }

  if (n.ReturnStatement.check(statement)) {
    const returnNode = statement as ReturnStatement;
    const block = createBlockInstance("return-statement", {
      argument: returnNode.argument ? sourceFor(returnNode.argument) : ""
    });
    attachMetadata(block, returnNode);
    blocks.push(block);
    return block;
  }

  if (n.IfStatement.check(statement)) {
    const ifNode = statement as IfStatement;
    const block = createBlockInstance("if-statement", {
      test: sourceFor(ifNode.test)
    });
    attachMetadata(block, ifNode);

    const consequentSlot = block.children.consequent;
    if (n.BlockStatement.check(ifNode.consequent)) {
      ifNode.consequent.body.forEach((inner: Statement) => {
        const innerBlock = convertStatement(inner, blocks);
        consequentSlot.push(innerBlock.id);
      });
    } else {
      const innerBlock = convertStatement(ifNode.consequent as Statement, blocks);
      consequentSlot.push(innerBlock.id);
    }

    const alternateSlot = block.children.alternate;
    if (ifNode.alternate) {
      if (n.BlockStatement.check(ifNode.alternate)) {
        ifNode.alternate.body.forEach((inner: Statement) => {
          const innerBlock = convertStatement(inner, blocks);
          alternateSlot.push(innerBlock.id);
        });
      } else {
        const innerBlock = convertStatement(ifNode.alternate as Statement, blocks);
        alternateSlot.push(innerBlock.id);
      }
    }

    blocks.push(block);
    return block;
  }

  if (n.WhileStatement.check(statement)) {
    const whileNode = statement as WhileStatement;
    const block = createBlockInstance("while-statement", {
      test: sourceFor(whileNode.test)
    });
    attachMetadata(block, whileNode);

    const bodySlot = block.children.body;
    if (n.BlockStatement.check(whileNode.body)) {
      whileNode.body.body.forEach((inner: Statement) => {
        const innerBlock = convertStatement(inner, blocks);
        bodySlot.push(innerBlock.id);
      });
    } else {
      const innerBlock = convertStatement(whileNode.body as Statement, blocks);
      bodySlot.push(innerBlock.id);
    }

    blocks.push(block);
    return block;
  }

  if (n.ForStatement.check(statement)) {
    const forNode = statement as ForStatement;
    const initializerCode = forNode.init ? sourceFor(forNode.init as Node) : "";
    const testCode = forNode.test ? sourceFor(forNode.test) : "";
    const updateCode = forNode.update ? sourceFor(forNode.update) : "";

    const block = createBlockInstance("for-statement", {
      initializer: initializerCode,
      test: testCode,
      update: updateCode
    });
    attachMetadata(block, forNode);

    const bodySlot = block.children.body;
    if (n.BlockStatement.check(forNode.body)) {
      forNode.body.body.forEach((inner: Statement) => {
        const innerBlock = convertStatement(inner, blocks);
        bodySlot.push(innerBlock.id);
      });
    } else {
      const innerBlock = convertStatement(forNode.body as Statement, blocks);
      bodySlot.push(innerBlock.id);
    }

    blocks.push(block);
    return block;
  }

  if (n.BreakStatement.check(statement)) {
    const breakBlock = createBlockInstance("break-statement");
    attachMetadata(breakBlock, statement);
    blocks.push(breakBlock);
    return breakBlock;
  }

  if (n.ThrowStatement.check(statement)) {
    const throwNode = statement as ThrowStatement;
    const block = createBlockInstance("throw-statement", {
      argument: throwNode.argument ? sourceFor(throwNode.argument) : ""
    });
    attachMetadata(block, throwNode);
    blocks.push(block);
    return block;
  }

  if (n.SwitchStatement.check(statement)) {
    const switchNode = statement as SwitchStatement;
    const block = createBlockInstance("switch-statement", {
      discriminant: sourceFor(switchNode.discriminant)
    });
    attachMetadata(block, switchNode);

    const casesSlot = block.children.cases;
    switchNode.cases.forEach((caseNode: SwitchCase) => {
      const caseBlock = createBlockInstance("switch-case", {
        isDefault: caseNode.test === null,
        test: caseNode.test ? sourceFor(caseNode.test) : ""
      });
      attachMetadata(caseBlock, caseNode);

      const bodySlot = caseBlock.children.body;
      caseNode.consequent.forEach((consequentStatement) => {
        const innerBlock = convertStatement(consequentStatement, blocks);
        bodySlot.push(innerBlock.id);
      });

      casesSlot.push(caseBlock.id);
      blocks.push(caseBlock);
    });

    blocks.push(block);
    return block;
  }

  if (n.TryStatement.check(statement)) {
    const tryNode = statement as TryStatement;
    const block = createBlockInstance("try-statement");
    attachMetadata(block, tryNode);

    const trySlot = block.children["try"];
    tryNode.block.body.forEach((tryStatement) => {
      const innerBlock = convertStatement(tryStatement, blocks);
      trySlot.push(innerBlock.id);
    });

    if (tryNode.handler) {
      const handler = tryNode.handler as CatchClause;
      const catchBlock = createBlockInstance("catch-clause", {
        param: handler.param ? sourceFor(handler.param) : ""
      });
      attachMetadata(catchBlock, handler);

      const catchBodySlot = catchBlock.children.body;
      handler.body.body.forEach((catchStatement: Statement) => {
        const innerBlock = convertStatement(catchStatement, blocks);
        catchBodySlot.push(innerBlock.id);
      });

      block.children["catch"].push(catchBlock.id);
      blocks.push(catchBlock);
    }

    if (tryNode.finalizer) {
      const finallySlot = block.children["finally"];
      tryNode.finalizer.body.forEach((finallyStatement: Statement) => {
        const innerBlock = convertStatement(finallyStatement, blocks);
        finallySlot.push(innerBlock.id);
      });
    }

    blocks.push(block);
    return block;
  }

  return createRawStatement(statement, blocks);
};

export const parseWorkflow = ({
  code,
  name = "Imported Workflow",
  sourcePath
}: {
  code: string;
  name?: string;
  sourcePath?: string;
}): WorkflowDocument => {
  const ast = recastParse(code, recastOptions) as unknown as File;
  const document = createDocument({ name });
  const root = document.blocks[document.root];
  const bodySlot = root.children.body;

  const collectedBlocks: BlockInstance[] = [];
  ast.program.body.forEach((statement) => {
    const block = convertStatement(statement as Statement, collectedBlocks);
    bodySlot.push(block.id);
  });

  const blocks: Record<string, BlockInstance> = {
    [root.id]: root
  };

  collectedBlocks.forEach((block) => {
    blocks[block.id] = block;
  });

  return {
    ...document,
    blocks,
    metadata: {
      ...document.metadata,
      sourcePath,
      updatedAt: new Date().toISOString()
    }
  };
};
