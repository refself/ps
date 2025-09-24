import { parse as babelParse } from "@babel/parser";
import type {
  AssignmentExpression,
  BinaryExpression,
  CallExpression,
  CatchClause,
  ExpressionStatement,
  File,
  ForStatement,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  MemberExpression,
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

const stringLiteralSource = (node: Node | null | undefined, fallback: string = ""): string => {
  const literalValue = stringLiteralValue(node);
  if (literalValue !== null) {
    return JSON.stringify(literalValue);
  }
  if (!node) {
    return fallback;
  }
  return sourceFor(node);
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

const binaryOperatorOperationMap: Record<string, "add" | "subtract" | "multiply" | "divide" | "modulo"> = {
  "+": "add",
  "-": "subtract",
  "*": "multiply",
  "/": "divide",
  "%": "modulo"
};

const compoundAssignmentOperationMap: Record<string, "add" | "subtract" | "multiply" | "divide" | "modulo"> = {
  "+=": "add",
  "-=": "subtract",
  "*=": "multiply",
  "/=": "divide",
  "%=": "modulo"
};

const isIdentifierNode = (node: Node | null | undefined, name: string): boolean => {
  if (!node) {
    return false;
  }
  return n.Identifier.check(node) && node.name === name;
};

const flattenBinaryOperands = ({
  expression,
  operator
}: {
  expression: BinaryExpression;
  operator: string;
}): Node[] => {
  const operands: Node[] = [];
  const visit = (node: Node) => {
    if (n.BinaryExpression.check(node) && node.operator === operator) {
      visit(node.left as Node);
      visit(node.right as Node);
      return;
    }
    operands.push(node);
  };
  visit(expression);
  return operands;
};

const extractBinaryAugmentedValue = ({
  identifier,
  expression
}: {
  identifier: string;
  expression: BinaryExpression;
}): { operation: "add" | "subtract" | "multiply" | "divide" | "modulo"; valueCode: string } | null => {
  const operation = binaryOperatorOperationMap[expression.operator];
  if (!operation) {
    return null;
  }

  if (expression.operator === "+") {
    const operands = flattenBinaryOperands({ expression, operator: expression.operator });
    if (operands.length > 1) {
      const [first, ...rest] = operands;
      if (isIdentifierNode(first, identifier)) {
        const valueCode = rest.map((node) => sourceFor(node)).join(" + ");
        if (valueCode.trim() !== "") {
          return { operation, valueCode };
        }
      }
    }
  }

  if (isIdentifierNode(expression.left as Node, identifier)) {
    return {
      operation,
      valueCode: sourceFor(expression.right as Node)
    };
  }

  return null;
};

type PushCallInfo = {
  arrayName: string;
  argument: Node;
};

const extractPushCallInfo = (call: CallExpression): PushCallInfo | null => {
  if (!n.MemberExpression.check(call.callee)) {
    return null;
  }

  const member = call.callee as MemberExpression;
  if (member.computed) {
    return null;
  }
  if (!n.Identifier.check(member.property) || member.property.name !== "push") {
    return null;
  }
  if (!n.Identifier.check(member.object)) {
    return null;
  }

  if (call.arguments.length !== 1) {
    return null;
  }
  const argumentNode = call.arguments[0];
  if (!argumentNode) {
    return null;
  }
  if ((argumentNode as Node).type === "SpreadElement") {
    return null;
  }

  return {
    arrayName: member.object.name,
    argument: argumentNode as Node
  };
};

const createVariableUpdateBlockFromAssignment = (assignment: AssignmentExpression): BlockInstance | null => {
  if (!n.Identifier.check(assignment.left)) {
    return null;
  }

  const identifier = assignment.left.name;

  if (assignment.operator === "=") {
    if (n.BinaryExpression.check(assignment.right)) {
      const extracted = extractBinaryAugmentedValue({ identifier, expression: assignment.right });
      if (extracted) {
        const block = createBlockInstance("variable-update", {
          identifier,
          operation: extracted.operation,
          value: extracted.valueCode,
          operatorStyle: "binary"
        });
        return block;
      }
    }

    const block = createBlockInstance("variable-update", {
      identifier,
      operation: "assign",
      value: sourceFor(assignment.right)
    });
    return block;
  }

  const operation = compoundAssignmentOperationMap[assignment.operator];
  if (!operation) {
    return null;
  }

  const block = createBlockInstance("variable-update", {
    identifier,
    operation,
    value: sourceFor(assignment.right),
    operatorStyle: "compound"
  });
  return block;
};

const createArrayPushBlockFromAssignment = (assignment: AssignmentExpression): BlockInstance | null => {
  if (assignment.operator !== "=") {
    return null;
  }
  if (!n.Identifier.check(assignment.left)) {
    return null;
  }
  if (!n.CallExpression.check(assignment.right)) {
    return null;
  }

  const info = extractPushCallInfo(assignment.right);
  if (!info || info.arrayName !== assignment.left.name) {
    return null;
  }

  return createBlockInstance("array-push", {
    array: info.arrayName,
    value: sourceFor(info.argument),
    storeResult: true
  });
};

const createArrayPushBlockFromCall = (call: CallExpression): BlockInstance | null => {
  const info = extractPushCallInfo(call);
  if (!info) {
    return null;
  }

  return createBlockInstance("array-push", {
    array: info.arrayName,
    value: sourceFor(info.argument),
    storeResult: false
  });
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
                instruction = sourceFor(property.value);
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

      if (calleeName === "readClipboard") {
        const block = createBlockInstance("read-clipboard-call", {
          assignTo: declarator.id.name
        });
        attachMetadata(block, declarationNode);
        blocks.push(block);
        return block;
      }

      if (calleeName === "fileReader") {
        const args = declarator.init.arguments;
        const pathsArg = args[0] ? sourceFor(args[0]) : "[]";
        const block = createBlockInstance("file-reader-call", {
          assignTo: declarator.id.name,
          paths: pathsArg
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
    const expression = expressionNode.expression;

    if (n.AssignmentExpression.check(expression)) {
      const assignment = expression as AssignmentExpression;

      const pushBlock = createArrayPushBlockFromAssignment(assignment);
      if (pushBlock) {
        attachMetadata(pushBlock, expressionNode);
        blocks.push(pushBlock);
        return pushBlock;
      }

      const updateBlock = createVariableUpdateBlockFromAssignment(assignment);
      if (updateBlock) {
        attachMetadata(updateBlock, expressionNode);
        blocks.push(updateBlock);
        return updateBlock;
      }
    }

    if (n.CallExpression.check(expression)) {
      const callExpression = expression as CallExpression;

      const pushBlock = createArrayPushBlockFromCall(callExpression);
      if (pushBlock) {
        attachMetadata(pushBlock, expressionNode);
        blocks.push(pushBlock);
        return pushBlock;
      }

      if (n.Identifier.check(callExpression.callee)) {
        const callee = callExpression.callee as Identifier;

        if (callee.name === "wait") {
          const durationValue = callExpression.arguments[0]
            ? numberLiteralValue(callExpression.arguments[0]) ?? Number(sourceFor(callExpression.arguments[0]))
            : 1;
          const block = createBlockInstance("wait-call", {
            duration: Number.isFinite(durationValue) ? durationValue : 1
          });
          attachMetadata(block, expressionNode);
          blocks.push(block);
          return block;
        }

        if (callee.name === "press") {
          const keyValue = stringLiteralSource(callExpression.arguments[0] ?? null, '"return"');
          let modifiers = "";
          const modifiersArg = callExpression.arguments[1];
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

        if (callee.name === "scroll") {
          const originArg = callExpression.arguments[0] ? sourceFor(callExpression.arguments[0]) : "[0, 0]";
          const directionArg = stringLiteralSource(callExpression.arguments[1] ?? null, '"down"');
          const amountLiteral = callExpression.arguments[2] ? numberLiteralValue(callExpression.arguments[2]) : null;
          const amountFallback = callExpression.arguments[2] ? Number(sourceFor(callExpression.arguments[2])) : 1;
          const amountValue = amountLiteral ?? (Number.isFinite(amountFallback) ? amountFallback : 1);
          const block = createBlockInstance("scroll-call", {
            origin: originArg,
            direction: directionArg,
            amount: amountValue
          });
          attachMetadata(block, expressionNode);
          blocks.push(block);
          return block;
        }

        if (callee.name === "selectAll") {
          const block = createBlockInstance("select-all-call", {});
          attachMetadata(block, expressionNode);
          blocks.push(block);
          return block;
        }

        if (callee.name === "click") {
          const targetExpression = callExpression.arguments[0] ? sourceFor(callExpression.arguments[0]) : "[0, 0]";
          const block = createBlockInstance("click-call", {
            target: targetExpression
          });
          attachMetadata(block, expressionNode);
          blocks.push(block);
          return block;
        }

        if (callee.name === "type") {
          const textValue = callExpression.arguments[0] ? sourceFor(callExpression.arguments[0]) : "\"\"";
          const block = createBlockInstance("type-call", {
            text: textValue
          });
          attachMetadata(block, expressionNode);
          blocks.push(block);
          return block;
        }

        if (callee.name === "log") {
          const messageExpression = callExpression.arguments[0] ? sourceFor(callExpression.arguments[0]) : "";
          const block = createBlockInstance("log-call", {
            message: messageExpression
          });
          attachMetadata(block, expressionNode);
          blocks.push(block);
          return block;
        }

        if (callee.name === "open") {
          const args = callExpression.arguments;
          const appName = stringLiteralSource(args[0] ?? null, '""');
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
          const url = stringLiteralSource(callExpression.arguments[0] ?? null, '""');
          const block = createBlockInstance("open-url-call", {
            url
          });
          attachMetadata(block, expressionNode);
          blocks.push(block);
          return block;
        }

        if (callee.name === "vision") {
          const args = callExpression.arguments;
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
          const target = callExpression.arguments[0] ? sourceFor(callExpression.arguments[0]) : "";
          const block = createBlockInstance("screenshot-call", {
            target
          });
          attachMetadata(block, expressionNode);
          blocks.push(block);
          return block;
        }

        const genericCallBlock = createFunctionCallBlock({
          functionName: callee.name,
          args: callExpression.arguments
        });
        attachMetadata(genericCallBlock, expressionNode);
        blocks.push(genericCallBlock);
        return genericCallBlock;
      }
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
