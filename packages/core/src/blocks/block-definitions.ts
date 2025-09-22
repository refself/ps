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
  description: "Pause execution for a specific number of seconds before continuing.",
  category: "automation",
  icon: "clock",
  fields: [
    {
      id: "duration",
      label: "Seconds",
      required: true,
      defaultValue: 1,
      description: "How long to wait. Fractions represent milliseconds (0.5 = 500ms).",
      input: {
        kind: "number",
        min: 0,
        step: 0.1
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [],
  outputs: [
    {
      id: "result",
      label: "Result",
      description: "Wait returns no value; flow continues afterwards."
    }
  ]
};

export const pressCallBlock: BlockSchema<"press-call"> = {
  kind: "press-call",
  label: "Press Key",
  description: "Simulate pressing a keyboard key with optional modifiers.",
  category: "automation",
  icon: "keyboard",
  fields: [
    {
      id: "key",
      label: "Key",
      required: true,
      description: "Name of the key to press (e.g. return, escape, a).",
      input: {
        kind: "string",
        placeholder: "return"
      }
    },
    {
      id: "modifiers",
      label: "Modifiers",
      description: "Comma-separated modifier keys (command, control, option, shift).",
      input: {
        kind: "string",
        placeholder: "command, shift"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [],
  outputs: [
    {
      id: "result",
      label: "Result",
      description: "No value returned; the next block runs immediately."
    }
  ]
};

export const clickCallBlock: BlockSchema<"click-call"> = {
  kind: "click-call",
  label: "Click",
  description: "Simulate a mouse click at the provided coordinates or on a locator result.",
  category: "automation",
  icon: "mouse",
  fields: [
    {
      id: "target",
      label: "Target",
      required: true,
      description: "Point to click. Accepts coordinate arrays (e.g. [x, y]) or locator coordinates.",
      input: {
        kind: "expression"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [],
  outputs: [
    {
      id: "result",
      label: "Result",
      description: "Click has no output; continue to the next block"
    }
  ]
};

export const typeCallBlock: BlockSchema<"type-call"> = {
  kind: "type-call",
  label: "Type Text",
  description: "Type text or evaluated expressions at the current focus location.",
  category: "automation",
  icon: "keyboard",
  fields: [
    {
      id: "text",
      label: "Text",
      required: true,
      description: "Expression that resolves to the text to type. Wrap literal text in quotes.",
      input: {
        kind: "expression"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [],
  outputs: [
    {
      id: "result",
      label: "Result",
      description: "No value returned; execution continues"
    }
  ]
};

export const scrollCallBlock: BlockSchema<"scroll-call"> = {
  kind: "scroll-call",
  label: "Scroll",
  description: "Scroll the specified area in a direction by a given amount.",
  category: "automation",
  icon: "mouse",
  fields: [
    {
      id: "origin",
      label: "Origin",
      required: false,
      description: "Coordinates to perform the scroll from. Defaults to the previously used location.",
      input: {
        kind: "expression"
      }
    },
    {
      id: "direction",
      label: "Direction",
      required: true,
      defaultValue: "down",
      description: "Direction to scroll.",
      input: {
        kind: "enum",
        options: [
          { label: "Down", value: "down" },
          { label: "Up", value: "up" },
          { label: "Left", value: "left" },
          { label: "Right", value: "right" }
        ]
      }
    },
    {
      id: "amount",
      label: "Distance",
      required: true,
      defaultValue: 3,
      description: "Scroll amount measured in wheel notches.",
      input: {
        kind: "number",
        min: 1,
        step: 1
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [],
  outputs: [
    {
      id: "result",
      label: "Result",
      description: "Scroll does not yield a value; flow continues"
    }
  ]
};

export const selectAllCallBlock: BlockSchema<"select-all-call"> = {
  kind: "select-all-call",
  label: "Select All",
  description: "Select all text/content in the active context.",
  category: "automation",
  icon: "keyboard",
  fields: [],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [],
  outputs: [
    {
      id: "result",
      label: "Result",
      description: "Returns nothing; subsequent blocks execute next"
    }
  ]
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
  description: "Send screenshots to the vision model and capture structured responses.",
  icon: "eye",
  fields: [
    {
      id: "identifier",
      label: "Store As",
      description: "Variable that will store the vision response object.",
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
      description: "Expression resolving to an image or array of images (e.g. screenshot().image).",
      input: {
        kind: "expression",
        expressionKind: "any"
      }
    },
    {
      id: "prompt",
      label: "Prompt",
      required: true,
      description: "Natural language instructions for the vision model.",
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
      description: "Return format. Use JSON when applying a schema.",
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
      description: "Optional JSON schema describing the AI response shape.",
      input: {
        kind: "json-schema"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [],
  outputs: [
    {
      id: "analysis",
      label: "Vision Result",
      description: "Object with parsed data (fields depend on prompt/schema)."
    }
  ]
};

export const aiCallBlock: BlockSchema<"ai-call"> = {
  kind: "ai-call",
  label: "AI Response",
  category: "ai",
  description: "Send a prompt to the AI model and capture text or JSON output.",
  icon: "sparkles",
  fields: [
    {
      id: "identifier",
      label: "Store As",
      required: false,
      description: "Optional variable name for the AI response (text, tokens, etc).",
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
      description: "Instructions provided to the AI model.",
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
      description: "Return format. Select JSON when providing a schema.",
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
        kind: "json-schema"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [],
  outputs: [
    {
      id: "response",
      label: "AI Result",
      description: "Response object (text property for text mode, structured fields for JSON mode)."
    }
  ]
};

export const screenshotCallBlock: BlockSchema<"screenshot-call"> = {
  kind: "screenshot-call",
  label: "Screenshot",
  category: "automation",
  description: "Capture the screen or a specific application window.",
  icon: "eye",
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
      id: "target",
      label: "Target PID",
      description: "Optional process identifier to capture",
      input: {
        kind: "code",
        language: "reflow",
        placeholder: "app.pid"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [],
  outputs: [
    { id: "image", label: "Image", description: "Base64 image data." },
    { id: "originalWidth", label: "Original Width", description: "Width of the captured region." },
    { id: "originalHeight", label: "Original Height", description: "Height of the captured region." },
    { id: "resizedWidth", label: "Resized Width", description: "Normalized width used for AI operations." },
    { id: "resizedHeight", label: "Resized Height", description: "Normalized height used for AI operations." }
  ]
};

export const locatorCallBlock: BlockSchema<"locator-call"> = {
  kind: "locator-call",
  label: "Locate Element",
  category: "automation",
  description: "Use vision or accessibility cues to locate an element on screen.",
  icon: "eye",
  fields: [
    {
      id: "identifier",
      label: "Store As",
      required: false,
      description: "Optional variable name to store the locator result (x, y, found, etc.).",
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
      description: "Natural language instruction describing what to locate.",
      input: {
        kind: "expression"
      }
    },
    {
      id: "element",
      label: "Accessibility Query",
      description: "Optional accessibility selector (e.g. role:textfield name=Email).",
      input: {
        kind: "string",
        placeholder: "role:button name=Submit"
      }
    },
    {
      id: "waitTime",
      label: "Wait Time (s)",
      description: "How long to wait while searching before giving up.",
      input: {
        kind: "number",
        min: 0,
        step: 0.5
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [],
  outputs: [
    { id: "found", label: "Found", description: "Boolean indicating if element was located." },
    { id: "coordinates", label: "Coordinates", description: "[x, y] center point array." },
    { id: "x", label: "X", description: "X coordinate of the element center." },
    { id: "y", label: "Y", description: "Y coordinate of the element center." },
    { id: "width", label: "Width", description: "Width of the detected element." },
    { id: "height", label: "Height", description: "Height of the detected element." }
  ]
};

export const readClipboardCallBlock: BlockSchema<"read-clipboard-call"> = {
  kind: "read-clipboard-call",
  label: "Read Clipboard",
  category: "automation",
  description: "Read the current clipboard contents as text.",
  icon: "clipboard",
  fields: [
    {
      id: "assignTo",
      label: "Store As",
      required: true,
      description: "Variable that receives the clipboard text.",
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [],
  outputs: [
    {
      id: "text",
      label: "Clipboard Text",
      description: "String value read from the clipboard."
    }
  ]
};

export const fileReaderCallBlock: BlockSchema<"file-reader-call"> = {
  kind: "file-reader-call",
  label: "Read Files",
  category: "io",
  description: "Read up to 10 files and convert their contents to markdown.",
  icon: "file",
  fields: [
    {
      id: "assignTo",
      label: "Store As",
      required: true,
      description: "Variable that receives the file reader result (results array, errors, tokens).",
      input: {
        kind: "identifier",
        scope: "variable",
        allowCreation: true
      }
    },
    {
      id: "paths",
      label: "Files or Directories",
      required: true,
      description: "Expression that resolves to an array of absolute file paths.",
      input: {
        kind: "expression"
      }
    }
  ],
  ports: [flowPorts.input, flowPorts.output],
  childSlots: [],
  outputs: [
    {
      id: "results",
      label: "Results",
      description: "Array of {name, data, tokens} for each processed file."
    },
    {
      id: "errors",
      label: "Errors",
      description: "List of files that failed to process."
    },
    {
      id: "tokenCount",
      label: "Token Count",
      description: "Estimated total tokens for all documents."
    }
  ]
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
  variableUpdateBlock,
  arrayPushBlock,
  returnStatementBlock,
  ifStatementBlock,
  functionDeclarationBlock,
  whileStatementBlock,
  forStatementBlock,
  breakStatementBlock,
  throwStatementBlock,
  functionCallBlock,
  waitCallBlock,
  pressCallBlock,
  clickCallBlock,
  scrollCallBlock,
  selectAllCallBlock,
  typeCallBlock,
  logCallBlock,
  openCallBlock,
  openUrlCallBlock,
  aiCallBlock,
  visionCallBlock,
  screenshotCallBlock,
  locatorCallBlock,
  readClipboardCallBlock,
  fileReaderCallBlock,
  switchCaseBlock,
  switchStatementBlock,
  catchClauseBlock,
  tryStatementBlock,
  rawStatementBlock
];
