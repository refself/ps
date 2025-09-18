import type { BlockSchema } from "../types";

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

export const programBlock: BlockSchema<"program"> = {
  kind: "program",
  label: "Program",
  category: "program",
  fields: [],
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

export const waitCallBlock: BlockSchema<"wait-call"> = {
  kind: "wait-call",
  label: "Wait",
  category: "automation",
  fields: [
    {
      id: "duration",
      label: "Seconds",
      required: true,
      defaultValue: 1,
      input: {
        kind: "number",
        min: 0,
        step: 0.1
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const pressCallBlock: BlockSchema<"press-call"> = {
  kind: "press-call",
  label: "Press Key",
  category: "automation",
  fields: [
    {
      id: "key",
      label: "Key",
      required: true,
      input: {
        kind: "string",
        placeholder: "return"
      }
    },
    {
      id: "modifiers",
      label: "Modifiers",
      description: "Comma-separated keys (command, shift, alt, control)",
      input: {
        kind: "string",
        placeholder: "command, shift"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const clickCallBlock: BlockSchema<"click-call"> = {
  kind: "click-call",
  label: "Click",
  category: "automation",
  fields: [
    {
      id: "target",
      label: "Target",
      required: true,
      input: {
        kind: "expression"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const typeCallBlock: BlockSchema<"type-call"> = {
  kind: "type-call",
  label: "Type Text",
  category: "automation",
  fields: [
    {
      id: "text",
      label: "Text",
      required: true,
      input: {
        kind: "string",
        multiline: true,
        placeholder: "Hello world"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const logCallBlock: BlockSchema<"log-call"> = {
  kind: "log-call",
  label: "Log Message",
  category: "utility",
  fields: [
    {
      id: "message",
      label: "Message",
      required: true,
      input: {
        kind: "expression"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const openCallBlock: BlockSchema<"open-call"> = {
  kind: "open-call",
  label: "Open App",
  category: "automation",
  fields: [
    {
      id: "identifier",
      label: "Store As",
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "appName",
      label: "Application",
      required: true,
      input: {
        kind: "string",
        placeholder: "Google Chrome"
      }
    },
    {
      id: "bringToFront",
      label: "Bring To Front",
      defaultValue: true,
      input: {
        kind: "boolean"
      }
    },
    {
      id: "waitSeconds",
      label: "Wait Seconds",
      defaultValue: 5,
      input: {
        kind: "number",
        min: 0,
        step: 0.5
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const openUrlCallBlock: BlockSchema<"open-url-call"> = {
  kind: "open-url-call",
  label: "Open URL",
  category: "automation",
  fields: [
    {
      id: "url",
      label: "URL",
      required: true,
      input: {
        kind: "string",
        placeholder: "https://example.com"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const visionCallBlock: BlockSchema<"vision-call"> = {
  kind: "vision-call",
  label: "Vision Analysis",
  category: "ai",
  fields: [
    {
      id: "identifier",
      label: "Store As",
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "target",
      label: "Image Source",
      required: true,
      input: {
        kind: "expression",
        expressionKind: "any"
      }
    },
    {
      id: "prompt",
      label: "Prompt",
      required: true,
      input: {
        kind: "string",
        multiline: true,
        placeholder: "Describe what to look for"
      }
    },
    {
      id: "format",
      label: "Output Format",
      defaultValue: "json",
      input: {
        kind: "enum",
        options: [
          { label: "JSON", value: "json" },
          { label: "Text", value: "text" }
        ]
      }
    },
    {
      id: "schema",
      label: "JSON Schema",
      input: {
        kind: "code",
        language: "json",
        placeholder: "{ \"type\": \"object\", ... }"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const aiCallBlock: BlockSchema<"ai-call"> = {
  kind: "ai-call",
  label: "AI Response",
  category: "ai",
  fields: [
    {
      id: "identifier",
      label: "Store As",
      required: false,
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "prompt",
      label: "Prompt",
      required: true,
      input: {
        kind: "string",
        multiline: true,
        placeholder: "Describe what the AI should do"
      }
    },
    {
      id: "format",
      label: "Output Format",
      required: false,
      defaultValue: "text",
      input: {
        kind: "enum",
        options: [
          { label: "Text", value: "text" },
          { label: "JSON", value: "json" }
        ]
      }
    },
    {
      id: "schema",
      label: "JSON Schema",
      description: "Provide when requesting structured JSON output",
      input: {
        kind: "code",
        language: "json",
        placeholder: "{ \"type\": \"object\", ... }"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

export const locatorCallBlock: BlockSchema<"locator-call"> = {
  kind: "locator-call",
  label: "Locate Element",
  category: "automation",
  fields: [
    {
      id: "identifier",
      label: "Store As",
      required: false,
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "instruction",
      label: "Instruction",
      required: true,
      input: {
        kind: "string",
        multiline: true,
        placeholder: "Explain what element to find"
      }
    },
    {
      id: "element",
      label: "Accessibility Query",
      input: {
        kind: "string",
        placeholder: "role:button name=Submit"
      }
    },
    {
      id: "waitTime",
      label: "Wait Time (s)",
      input: {
        kind: "number",
        min: 0,
        step: 0.5
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: []
};

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
  returnStatementBlock,
  ifStatementBlock,
  functionDeclarationBlock,
  whileStatementBlock,
  forStatementBlock,
  breakStatementBlock,
  throwStatementBlock,
  waitCallBlock,
  pressCallBlock,
  clickCallBlock,
  typeCallBlock,
  logCallBlock,
  openCallBlock,
  openUrlCallBlock,
  aiCallBlock,
  visionCallBlock,
  locatorCallBlock,
  switchCaseBlock,
  switchStatementBlock,
  catchClauseBlock,
  tryStatementBlock,
  rawStatementBlock
];
