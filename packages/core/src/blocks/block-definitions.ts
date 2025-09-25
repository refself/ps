import type {
  BlockFieldDefinition,
  BlockOutputDefinition,
  BlockSchema,
  FieldInputConfiguration
} from "../types";

import { apiManifestEntries } from "./config/api-manifest";
import type {
  ApiFieldDefinition,
  ApiFieldInputConfiguration,
  ApiManifestEntry,
  ApiOutputDefinition
} from "./config/api-manifest-schema";

const anyValueType = { kind: "any" } as const;
const numberValueType = { kind: "number" } as const;
const stringValueType = { kind: "string" } as const;

const flowPorts = {
  input: {
    id: "flow-in",
    label: "In",
    direction: "input" as const,
    portKind: "flow" as const,
    multiplicity: "single" as const
  },
  output: {
    id: "flow-out",
    label: "Out",
    direction: "output" as const,
    portKind: "flow" as const,
    multiplicity: "single" as const
  }
};

const cloneInputConfiguration = (input: ApiFieldInputConfiguration): FieldInputConfiguration => {
  switch (input.kind) {
    case "string":
      return {
        kind: "string",
        multiline: input.multiline,
        placeholder: input.placeholder ?? undefined
      };
    case "number":
      return {
        kind: "number",
        min: input.min,
        max: input.max,
        step: input.step
      };
    case "boolean":
      return { kind: "boolean" };
    case "enum":
      return {
        kind: "enum",
        options: (input.options ?? []).map((option) => ({ ...option }))
      };
    case "expression":
      return {
        kind: "expression",
        expressionKind: input.expressionKind
      };
    case "identifier":
      return {
        kind: "identifier",
        scope: input.scope ?? "variable",
        allowCreation: input.allowCreation
      };
    case "code":
      return {
        kind: "code",
        language: input.language ?? "reflow",
        placeholder: input.placeholder
      };
    case "json-schema":
      return { kind: "json-schema" };
    default:
      return input as unknown as FieldInputConfiguration;
  }
};

const cloneFieldDefinition = (field: ApiFieldDefinition): BlockFieldDefinition => ({
  id: field.id,
  label: field.label,
  description: field.description,
  required: field.required,
  defaultValue: field.defaultValue ?? undefined,
  input: cloneInputConfiguration(field.input),
  valueType: field.valueType
});

const cloneOutputDefinition = (output: ApiOutputDefinition): BlockOutputDefinition => ({
  id: output.id,
  label: output.label,
  description: output.description,
  valueType: output.valueType
});

const createApiBlockSchema = (entry: ApiManifestEntry): BlockSchema => {
  const fields = entry.fields.map(cloneFieldDefinition);
  const outputs = entry.outputs?.map(cloneOutputDefinition);

  return {
    kind: entry.blockKind,
    label: entry.label,
    category: entry.category,
    icon: entry.icon,
    description: entry.description,
    fields,
    ports: [flowPorts.input, flowPorts.output],
    childSlots: [],
    ...(outputs && outputs.length > 0 ? { outputs } : {})
  } satisfies BlockSchema;
};

const apiBlocksByKind = new Map<string, BlockSchema>();
const apiCallBlocks: BlockSchema[] = apiManifestEntries.map((entry) => {
  const schema = createApiBlockSchema(entry);
  apiBlocksByKind.set(entry.blockKind, schema);
  return schema;
});

export const programBlock: BlockSchema<"program"> = {
  kind: "program",
  label: "Program",
  category: "program",
  fields: [
    {
      id: "enableNarration",
      label: "Enable Narration",
      description: "Play spoken feedback while running the workflow.",
      defaultValue: true,
      input: {
        kind: "boolean"
      }
    }
  ],
  ports: [flowPorts.output],
  childSlots: [
    {
      id: "body",
      label: "Body"
    }
  ]
};

export const expressionStatementBlock: BlockSchema<"expression-statement"> = {
  kind: "expression-statement",
  label: "Expression",
  category: "expressions",
  fields: [
    {
      id: "code",
      label: "Expression",
      description: "Reflow expression evaluated for its side effects.",
      required: false,
      input: {
        kind: "code",
        language: "reflow",
        placeholder: "callSomething()"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const variableDeclarationBlock: BlockSchema<"variable-declaration"> = {
  kind: "variable-declaration",
  label: "Variable",
  category: "variables",
  fields: [
    {
      id: "identifier",
      label: "Name",
      required: true,
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "initializer",
      label: "Initializer",
      required: true,
      input: {
        kind: "code",
        language: "reflow",
        placeholder: "value"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const variableUpdateBlock: BlockSchema<"variable-update"> = {
  kind: "variable-update",
  label: "Update Variable",
  category: "variables",
  description: "Assign or update an existing variable using common operations.",
  fields: [
    {
      id: "identifier",
      label: "Variable",
      required: true,
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "operation",
      label: "Operation",
      required: true,
      defaultValue: "assign",
      input: {
        kind: "enum",
        options: [
          { label: "Set To", value: "assign" },
          { label: "Add / Concatenate", value: "add" },
          { label: "Subtract", value: "subtract" },
          { label: "Multiply", value: "multiply" },
          { label: "Divide", value: "divide" },
          { label: "Modulo", value: "modulo" }
        ]
      }
    },
    {
      id: "value",
      label: "Value",
      required: true,
      input: {
        kind: "code",
        language: "reflow",
        placeholder: "value"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const arrayPushBlock: BlockSchema<"array-push"> = {
  kind: "array-push",
  label: "Append To Array",
  category: "variables",
  description: "Push a value onto an array variable and optionally overwrite it with the push result.",
  fields: [
    {
      id: "array",
      label: "Array",
      required: true,
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "value",
      label: "Item",
      required: true,
      input: {
        kind: "code",
        language: "reflow",
        placeholder: "value"
      }
    },
    {
      id: "storeResult",
      label: "Store push() result",
      description: "Assign the numeric push return value back to the array variable.",
      defaultValue: false,
      input: {
        kind: "boolean"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const functionCallBlock: BlockSchema<"function-call"> = {
  kind: "function-call",
  label: "Function Call",
  description: "Execute any Reflow function with optional arguments and variable assignment.",
  category: "utility",
  fields: [
    {
      id: "assignTo",
      label: "Store As",
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "functionName",
      label: "Function",
      required: true,
      input: {
        kind: "string",
        placeholder: "screenshot"
      }
    },
    {
      id: "arguments",
      label: "Arguments",
      description: "Comma-separated list or raw code expression",
      input: {
        kind: "string",
        multiline: true,
        placeholder: "arg1, arg2"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const returnStatementBlock: BlockSchema<"return-statement"> = {
  kind: "return-statement",
  label: "Return",
  category: "control",
  fields: [
    {
      id: "argument",
      label: "Value",
      required: false,
      input: {
        kind: "code",
        language: "reflow",
        placeholder: "result"
      }
    }
  ],
  ports: [flowPorts.input],
  childSlots: []
};

export const ifStatementBlock: BlockSchema<"if-statement"> = {
  kind: "if-statement",
  label: "If",
  category: "control",
  fields: [
    {
      id: "test",
      label: "Condition",
      required: true,
      input: {
        kind: "code",
        language: "reflow",
        placeholder: "condition"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [
    {
      id: "consequent",
      label: "Then"
    },
    {
      id: "alternate",
      label: "Else"
    }
  ]
};

export const functionDeclarationBlock: BlockSchema<"function-declaration"> = {
  kind: "function-declaration",
  label: "Function",
  category: "functions",
  fields: [
    {
      id: "identifier",
      label: "Name",
      required: true,
      input: {
        kind: "identifier",
        scope: "function",
        allowCreation: true
      }
    },
    {
      id: "parameters",
      label: "Parameters",
      description: "Comma-separated parameter names",
      input: {
        kind: "code",
        language: "reflow",
        placeholder: "arg1, arg2"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [
    {
      id: "body",
      label: "Body"
    }
  ]
};

export const whileStatementBlock: BlockSchema<"while-statement"> = {
  kind: "while-statement",
  label: "While",
  category: "control",
  fields: [
    {
      id: "test",
      label: "Condition",
      required: true,
      input: {
        kind: "code",
        language: "reflow",
        placeholder: "i < 10"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [
    {
      id: "body",
      label: "Body"
    }
  ]
};

export const forStatementBlock: BlockSchema<"for-statement"> = {
  kind: "for-statement",
  label: "For",
  category: "control",
  fields: [
    {
      id: "initializer",
      label: "Initializer",
      required: false,
      input: {
        kind: "code",
        language: "reflow",
        placeholder: "let i = 0"
      }
    },
    {
      id: "test",
      label: "Condition",
      required: false,
      input: {
        kind: "code",
        language: "reflow",
        placeholder: "i < items.length"
      }
    },
    {
      id: "update",
      label: "Update",
      required: false,
      input: {
        kind: "code",
        language: "reflow",
        placeholder: "i = i + 1"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [
    {
      id: "body",
      label: "Body"
    }
  ]
};

export const forOfStatementBlock: BlockSchema<"for-of-statement"> = {
  kind: "for-of-statement",
  label: "For Each",
  description: "Iterate over iterable values using for…of.",
  category: "control",
  fields: [
    {
      id: "declarationKind",
      label: "Variable Kind",
      defaultValue: "const",
      input: {
        kind: "enum",
        options: [
          { label: "const", value: "const" },
          { label: "let", value: "let" },
          { label: "assign", value: "assign" }
        ]
      }
    },
    {
      id: "identifier",
      label: "Item",
      required: true,
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "iterable",
      label: "Iterable",
      required: true,
      input: {
        kind: "expression"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [
    {
      id: "body",
      label: "Body"
    }
  ]
};

export const forInStatementBlock: BlockSchema<"for-in-statement"> = {
  kind: "for-in-statement",
  label: "For In",
  description: "Iterate over object keys using for…in.",
  category: "control",
  fields: [
    {
      id: "declarationKind",
      label: "Variable Kind",
      defaultValue: "const",
      input: {
        kind: "enum",
        options: [
          { label: "const", value: "const" },
          { label: "let", value: "let" },
          { label: "assign", value: "assign" }
        ]
      }
    },
    {
      id: "identifier",
      label: "Key",
      required: true,
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "source",
      label: "Source",
      required: true,
      input: {
        kind: "expression"
      },
      valueType: anyValueType
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [
    {
      id: "body",
      label: "Body"
    }
  ]
};

export const doWhileStatementBlock: BlockSchema<"do-while-statement"> = {
  kind: "do-while-statement",
  label: "Do While",
  category: "control",
  fields: [
    {
      id: "test",
      label: "Condition",
      required: true,
      input: {
        kind: "expression"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [
    {
      id: "body",
      label: "Body"
    }
  ]
};

export const breakStatementBlock: BlockSchema<"break-statement"> = {
  kind: "break-statement",
  label: "Break",
  category: "control",
  fields: [],
  ports: [flowPorts.input],
  childSlots: []
};

export const throwStatementBlock: BlockSchema<"throw-statement"> = {
  kind: "throw-statement",
  label: "Throw",
  category: "control",
  fields: [
    {
      id: "argument",
      label: "Expression",
      required: true,
      input: {
        kind: "code",
        language: "reflow",
        placeholder: "error"
      }
    }
  ],
  ports: [flowPorts.input],
  childSlots: []
};

export const arrayForEachBlock: BlockSchema<"array-for-each"> = {
  kind: "array-for-each",
  label: "Array For Each",
  description: "Run a block for each item using array.forEach().",
  category: "control",
  fields: [
    {
      id: "array",
      label: "Array",
      required: true,
      input: {
        kind: "expression"
      }
    },
    {
      id: "itemIdentifier",
      label: "Item",
      required: true,
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "indexIdentifier",
      label: "Index",
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [
    {
      id: "body",
      label: "Body"
    }
  ]
};

export const arrayMapBlock: BlockSchema<"array-map"> = {
  kind: "array-map",
  label: "Array Map",
  description: "Transform items using array.map().",
  category: "expressions",
  fields: [
    {
      id: "declarationKind",
      label: "Store As",
      defaultValue: "const",
      input: {
        kind: "enum",
        options: [
          { label: "const", value: "const" },
          { label: "let", value: "let" },
          { label: "assign", value: "assign" }
        ]
      }
    },
    {
      id: "target",
      label: "Result Variable",
      required: true,
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "array",
      label: "Array",
      required: true,
      input: {
        kind: "expression"
      }
    },
    {
      id: "itemIdentifier",
      label: "Item",
      required: true,
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "indexIdentifier",
      label: "Index",
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [
    {
      id: "body",
      label: "Mapper Body"
    }
  ]
};

export const arrayFilterBlock: BlockSchema<"array-filter"> = {
  kind: "array-filter",
  label: "Array Filter",
  description: "Keep matching items using array.filter().",
  category: "expressions",
  fields: [
    {
      id: "declarationKind",
      label: "Store As",
      defaultValue: "const",
      input: {
        kind: "enum",
        options: [
          { label: "const", value: "const" },
          { label: "let", value: "let" },
          { label: "assign", value: "assign" }
        ]
      }
    },
    {
      id: "target",
      label: "Result Variable",
      required: true,
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "array",
      label: "Array",
      required: true,
      input: {
        kind: "expression"
      }
    },
    {
      id: "itemIdentifier",
      label: "Item",
      required: true,
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "indexIdentifier",
      label: "Index",
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [
    {
      id: "body",
      label: "Filter Body"
    }
  ]
};

export const mathOperationBlock: BlockSchema<"math-operation"> = {
  kind: "math-operation",
  label: "Math",
  description: "Compute a numeric expression and store it.",
  category: "expressions",
  fields: [
    {
      id: "declarationKind",
      label: "Store As",
      defaultValue: "const",
      input: {
        kind: "enum",
        options: [
          { label: "const", value: "const" },
          { label: "let", value: "let" },
          { label: "assign", value: "assign" }
        ]
      }
    },
    {
      id: "target",
      label: "Result Variable",
      required: true,
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "left",
      label: "Left",
      required: true,
      input: {
        kind: "expression"
      },
      valueType: numberValueType
    },
    {
      id: "operator",
      label: "Operator",
      defaultValue: "add",
      input: {
        kind: "enum",
        options: [
          { label: "+", value: "add" },
          { label: "-", value: "subtract" },
          { label: "×", value: "multiply" },
          { label: "÷", value: "divide" },
          { label: "%", value: "modulo" },
          { label: "^", value: "power" }
        ]
      }
    },
    {
      id: "right",
      label: "Right",
      required: true,
      input: {
        kind: "expression"
      },
      valueType: numberValueType
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const stringOperationBlock: BlockSchema<"string-operation"> = {
  kind: "string-operation",
  label: "String",
  description: "Apply common string helpers and store the result.",
  category: "expressions",
  fields: [
    {
      id: "declarationKind",
      label: "Store As",
      defaultValue: "const",
      input: {
        kind: "enum",
        options: [
          { label: "const", value: "const" },
          { label: "let", value: "let" },
          { label: "assign", value: "assign" }
        ]
      }
    },
    {
      id: "target",
      label: "Result Variable",
      required: true,
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "source",
      label: "String",
      required: true,
      input: {
        kind: "expression"
      },
      valueType: stringValueType
    },
    {
      id: "operation",
      label: "Operation",
      defaultValue: "toUpperCase",
      input: {
        kind: "enum",
        options: [
          { label: "Uppercase", value: "toUpperCase" },
          { label: "Lowercase", value: "toLowerCase" },
          { label: "Trim", value: "trim" },
          { label: "Includes", value: "includes" },
          { label: "Starts With", value: "startsWith" },
          { label: "Ends With", value: "endsWith" },
          { label: "Slice", value: "slice" },
          { label: "Substring", value: "substring" },
          { label: "Replace", value: "replace" },
          { label: "Pad Start", value: "padStart" },
          { label: "Pad End", value: "padEnd" },
          { label: "Concat", value: "concat" }
        ]
      }
    },
    {
      id: "argument",
      label: "Argument",
      description: "Optional first argument (depends on operation).",
      input: {
        kind: "expression"
      },
      valueType: anyValueType
    },
    {
      id: "argumentTwo",
      label: "Second Argument",
      description: "Optional second argument.",
      input: {
        kind: "expression"
      },
      valueType: anyValueType
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const waitCallBlock = apiBlocksByKind.get("wait-call") as BlockSchema<"wait-call">;

export const pressCallBlock = apiBlocksByKind.get("press-call") as BlockSchema<"press-call">;

export const clickCallBlock = apiBlocksByKind.get("click-call") as BlockSchema<"click-call">;

export const typeCallBlock = apiBlocksByKind.get("type-call") as BlockSchema<"type-call">;

export const scrollCallBlock = apiBlocksByKind.get("scroll-call") as BlockSchema<"scroll-call">;

export const selectAllCallBlock = apiBlocksByKind.get("select-all-call") as BlockSchema<"select-all-call">;

export const logCallBlock = apiBlocksByKind.get("log-call") as BlockSchema<"log-call">;

export const openCallBlock = apiBlocksByKind.get("open-call") as BlockSchema<"open-call">;

export const openUrlCallBlock = apiBlocksByKind.get("open-url-call") as BlockSchema<"open-url-call">;

export const visionCallBlock = apiBlocksByKind.get("vision-call") as BlockSchema<"vision-call">;

export const aiCallBlock = apiBlocksByKind.get("ai-call") as BlockSchema<"ai-call">;

export const screenshotCallBlock = apiBlocksByKind.get("screenshot-call") as BlockSchema<"screenshot-call">;

export const locatorCallBlock = apiBlocksByKind.get("locator-call") as BlockSchema<"locator-call">;

export const readClipboardCallBlock = apiBlocksByKind.get("read-clipboard-call") as BlockSchema<"read-clipboard-call">;

export const fileReaderCallBlock = apiBlocksByKind.get("file-reader-call") as BlockSchema<"file-reader-call">;

export const switchCaseBlock: BlockSchema<"switch-case"> = {
  kind: "switch-case",
  label: "Case",
  category: "control",
  fields: [
    {
      id: "isDefault",
      label: "Default Case",
      required: false,
      defaultValue: false,
      input: {
        kind: "boolean"
      }
    },
    {
      id: "test",
      label: "Match Expression",
      required: false,
      input: {
        kind: "code",
        language: "reflow",
        placeholder: "value"
      }
    }
  ],
  ports: [],
  childSlots: [
    {
      id: "body",
      label: "Body"
    }
  ]
};

export const switchStatementBlock: BlockSchema<"switch-statement"> = {
  kind: "switch-statement",
  label: "Switch",
  category: "control",
  fields: [
    {
      id: "discriminant",
      label: "Expression",
      required: true,
      input: {
        kind: "code",
        language: "reflow",
        placeholder: "value"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [
    {
      id: "cases",
      label: "Cases"
    }
  ]
};

export const catchClauseBlock: BlockSchema<"catch-clause"> = {
  kind: "catch-clause",
  label: "Catch",
  category: "control",
  fields: [
    {
      id: "param",
      label: "Identifier",
      required: false,
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    }
  ],
  ports: [],
  childSlots: [
    {
      id: "body",
      label: "Body"
    }
  ]
};

export const tryStatementBlock: BlockSchema<"try-statement"> = {
  kind: "try-statement",
  label: "Try",
  category: "control",
  fields: [],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [
    {
      id: "try",
      label: "Try"
    },
    {
      id: "catch",
      label: "Catch"
    },
    {
      id: "finally",
      label: "Finally"
    }
  ]
};

export const rawStatementBlock: BlockSchema<"raw-statement"> = {
  kind: "raw-statement",
  label: "Raw Statement",
  category: "raw",
  description: "Preserves constructs that do not yet have a dedicated block type.",
  fields: [
    {
      id: "code",
      label: "Code",
      required: true,
      input: {
        kind: "code",
        language: "reflow"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const knownBlockSchemas: BlockSchema[] = [
  programBlock,
  expressionStatementBlock,
  variableDeclarationBlock,
  variableUpdateBlock,
  arrayPushBlock,
  returnStatementBlock,
  ifStatementBlock,
  functionDeclarationBlock,
  whileStatementBlock,
  forStatementBlock,
  forOfStatementBlock,
  forInStatementBlock,
  doWhileStatementBlock,
  arrayForEachBlock,
  arrayMapBlock,
  arrayFilterBlock,
  mathOperationBlock,
  stringOperationBlock,
  breakStatementBlock,
  throwStatementBlock,
  functionCallBlock,
  ...apiCallBlocks,
  switchCaseBlock,
  switchStatementBlock,
  catchClauseBlock,
  tryStatementBlock,
  rawStatementBlock
];
