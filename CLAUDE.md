## Workflow Builder — Implementation Prompt

### Objective
Build a visual, Scratch-like workflow builder that lets users compose automation scripts by arranging, connecting, and configuring blocks. The system must support importing existing Reflow scripts, visualizing them faithfully, editing, and exporting/generating valid Reflow code with no loss of information.

### Scope and Requirements
- **Language Coverage**: Implement a complete set of blocks covering every construct described in `reflow-language.md`. This includes composition, function combination, variable definitions and references, control flow, and any other primitives or higher-level blocks defined there.
- **Import/Export**:
  - Import `.rf` files and render them as a graph on the canvas.
  - Edit visually and regenerate code exactly (lossless round-trip where possible).
  - Provide a live code preview and a “Copy code” action for the current workflow.
- **Demos**: Ensure the demos in `demos/` (`invoice-categorization.rf`, `job-hunt.rf`, `talent-search.rf`) import and visualize correctly. Editing and exporting these should preserve intent and structure.
- **Block Composition**:
  - Allow chaining, branching, and nesting according to the semantics in `reflow-language.md`.
  - Provide Scratch-style container blocks (If/For/Switch/Function) with typed child slots (e.g., then[], else[], body[], cases[], default[]) for visual grouping and nesting.
  - Support block configuration via well-typed props/forms and validate inputs.
  - Support variable scoping and references between blocks, with clear UX for selecting and reusing values.
- **UX**:
  - Drag-and-drop to add, reorder, connect, and detach blocks.
  - Clear connector affordances for valid connections; prevent invalid links.
  - Keyboard navigation and basic accessibility for essential actions.
- **Performance**: Keep interactions smooth for medium-sized graphs. Avoid unnecessary re-renders.

### package manager: pnpm with workspace
This project uses pnpm workspaces to manage dependencies. Important scripts are in the root package.json or various packages package.json

try to run commands inside the package folder that you are working on. for example you should never run pnpm test from the root

### typescript
Try to use object arguments for new typescript functions if the function would accept more than one argument, this way you can use the object as a sort of named argument feature, where order of arguments does not matter and it's easier to discover parameters.

do not add useless comments if the code is self descriptive. only add comments if requested or if this was a change that i asked for, meaning it is not obvious code and needs some inline documentation.

try to use early returns and breaks, try nesting code as little as possible, follow the go best practice of if statements: avoid else, nest as little as possible, use top level ifs. minimize nesting.

after any change to typescript code ALWAYS run the pnpm typecheck script of that package, or if there is no typecheck script run pnpm tsc yourself


### type safety
react-router exports a Route namespace with types like Route.LoaderArgs, Route.ActionArgs and Route.ComponentProps

these types can be used for the main route exports, they must be imported from ./+types/{route-basename}

For example if the current file is src/routes/home.tsx you can import import { Route } from './+types/home'.

### styling
always use tailwind for styling, prefer using simple styles using flex and gap. Try to use the built in tailwind colors like gray, red, green, etc. Margins should be avoided, instead use flexbox gaps, grid gaps, or separate spacing divs.

### files
always use kebab case for new filenames. never use uppercase letters in filenames

### Tech Stack
- **React**
- **TypeScript** (strict typing)
- **React DnD** for drag-and-drop interactions

Use the fetch tool to retrieve React DnD guidance; you can change `topic` and `tokens` to focus and control length:
`https://context7.com/react-dnd/react-dnd/llms.txt?topic=<your+topic>&tokens=<N>`
Examples:
`https://context7.com/react-dnd/react-dnd/llms.txt?topic=chained+connector&tokens=24000`
`https://context7.com/react-dnd/react-dnd/llms.txt?topic=drag+layer&tokens=12000`

### Architecture and Design
- **Separation of Concerns**: Keep rendering/UX separate from workflow semantics.
  - `blocks/`: Block schemas, types, defaults, and validation.
  - `graph/`: Data structures for nodes, edges, ports, and graph utilities.
  - `parsing/`: `.rf` → internal model parser using `reflow-language.md` rules.
  - `codegen/`: internal model → `.rf` generator (lossless where possible).
  - `components/`: Presentational components (canvas, panel, inspector, block views).
  - `state/`: Editor state, selection, history/undo if needed.
- **Typed Block Model**:
  - Define a strongly-typed block schema for every Reflow construct.
  - Each block declares: kind, inputs/outputs/ports, configurable fields, validation, and serialization.
  - Provide helpers for variable definition/reference blocks with explicit scopes.
- **Connectors**:
  - Implement typed ports and edges to constrain valid connections at compile time and runtime.
  - Visual feedback for allowed vs. disallowed connections.
- **Round-Trip Fidelity**:
  - Parsing and codegen should preserve block ordering, configuration, and references.
  - Unknown or future constructs should degrade gracefully (e.g., render as generic block with raw payload) and be preserved through export.

### Implementation Guidelines
- Enable `strict` TypeScript and avoid `any`.
- Favor pure functions for parsing, validation, and codegen.
- Keep React components lean; move logic to plain TypeScript modules.
- Provide lightweight unit tests for parser and codegen of representative blocks.
- Name things clearly; prefer descriptive types and props.

### Deliverables
- A working React + TypeScript app with:
  - Canvas for building workflows via drag-and-drop and connectors.
  - Block library covering all constructs from `reflow-language.md`.
  - Import/export of `.rf`, live preview, and “Copy code”.
  - Correct visualization of all files in `demos/`.
- Brief developer docs explaining how to add a new block type and how parsing/codegen map to the schema.

### Notes
- Keep dependencies minimal (React, TypeScript, React DnD, and small utilities as needed).
- Prioritize clarity and maintainability over cleverness. Write readable, well-typed code.
