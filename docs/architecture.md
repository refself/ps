# Workflow Builder Architecture Plan

## Workspace Layout
- `package.json` (root): declares pnpm workspace, shared scripts (`lint`, `format`, `build`).
- `packages/core`: typed domain layer for blocks, graphs, parsing, codegen, validation.
- `packages/web`: React application that consumes `@workflow-builder/core` and implements the editor UI.
- `packages/core-tests`: lightweight Vitest suite covering parser/codegen round-trips (optional if we co-locate tests in `packages/core`).
- `demos/`: source `.rf` scripts used for import/export validation.
- `docs/`: developer documentation (architecture overview, block authoring guide).

## Domain Model (packages/core)
- `src/index.ts`: exports public API.
- `src/blocks/`
  - `schema.ts`: strongly typed block schema definitions per Reflow construct. Each block declares:
    - `kind` (discriminant)
    - `category` (variables, control, ai, io, utility, etc.)
    - `ports`: typed input/output sockets with direction + multiplicity.
    - `fields`: configurable props with validation metadata (type, required, default, enum, min/max).
    - `children`: slot descriptors for container blocks (arrays for `body`, `then`, `else`, `cases`, etc.).
    - `serialize` / `hydrate`: convert between AST nodes and schema instances.
  - `registry.ts`: central registry keyed by `kind` that exposes helpers for UI palettes and validation.
  - `validation.ts`: runtime validation helpers for block instances and connections.
- `src/graph/`
  - `types.ts`: graph primitives (`WorkflowDocument`, `BlockInstance`, `Connection`, `PortId`).
  - `graph-utils.ts`: helpers for traversals, scope resolution, and mutation (pure functions).
  - `scope.ts`: utilities for variable definition/lookup across nested blocks.
- `src/parsing/`
  - `parser.ts`: converts `.rf` source → Babel AST → `WorkflowDocument`. Keeps comment/location metadata for regeneration.
  - `ast-to-blocks/`: visitor functions for each AST node → block instance(s).
  - `tokens.ts`: utilities to retain formatting hints (leading comments, raw literals) for lossless round-trip.
- `src/codegen/`
  - `blocks-to-ast/`: symmetric visitors mapping blocks back to AST nodes.
  - `generator.ts`: assembles Program AST and prints with `recast.print()` retaining layout/comments.
  - `preview.ts`: incremental code preview generator used by the UI.
- `src/io/`
  - `import.ts`: orchestrates parse + validation.
  - `export.ts`: orchestrates codegen + formatting.
- `src/state/`
  - Pure reducers/selectors for mutations (add/remove/move blocks, connect/disconnect, update fields).
  - History manager for undo/redo using persistent document snapshots.

## React Application (packages/web)
- Vite + React + TS + Tailwind + React DnD.
- Directory structure:
  - `src/main.tsx`: app bootstrap, providers (DnD backend, theme, keyboard shortcuts).
  - `src/app.tsx`: high-level layout (left palette, center canvas, right inspector + code preview).
  - `src/components/`
    - `palette/`: block list grouped by category.
    - `canvas/`: core DnD canvas using React DnD + custom drag layer.
    - `canvas/block-node.tsx`: renders block shells based on schema + state.
    - `canvas/connector.tsx`: handles port interaction + connection creation.
    - `inspector/`: forms bound to selected block fields, dynamic per schema.
    - `code-preview/`: live generated code with copy-to-clipboard.
  - `src/state/`: hooks wrapping `@workflow-builder/core` reducer/state; context provider for editor document, selection, history.
  - `src/hooks/keyboard.ts`: essential keyboard shortcuts (delete, duplicate, undo/redo, navigation).
  - `src/utils/drag.ts`: DnD helper utilities.
- Accessibility: focus ring styles, keyboard navigation for palette/canvas, announcements via ARIA-live region.

## Data Flow
1. Import `.rf` → `core.importWorkflow()` returns `WorkflowDocument` with block instances and metadata.
2. Editor state provider stores document, selection, history stacks.
3. UI components render from document via selectors. Mutations dispatch reducer actions returning new documents.
4. Code preview subscribes to document and invokes `core.generateCode(document)`, debounced for performance.
5. Export uses same generator to produce `.rf` text.

## Block Coverage Strategy
- Start with foundational blocks: Program, FunctionDeclaration, VariableDeclaration, Return, ExpressionStatement, If, For, While, DoWhile, Switch, Break, Continue, Try, Catch, Finally, Throw.
- Expression blocks: Identifier, Literal (string/number/boolean/null/template), Binary, Logical, Unary, Assignment, Update, Call, Member, Conditional (ternary), Array, Object, Property, Template literal chunk.
- Statement wrappers for built-in APIs (e.g., `ai`, `vision`, `locator`, `open`, etc.) rely on generic Call block but include palette shortcuts with pre-filled call names and typed fields.
- Provide library of commonly used call presets defined in `blocks/presets/` referencing underlying Call block definition.
- Variable scoping tracked via `scope.ts` to ensure reference blocks list in-scope identifiers.
- Unknown AST nodes degrade to `RawCodeBlock` storing original snippet, ensuring export fidelity.

## Undo/Redo & History
- Maintain stack of `WorkflowDocument` snapshots (immer or structural sharing). Limit history length to ensure performance.
- Actions include: add block, remove block, update field, connect ports, reorder container children, import document.

## Performance Considerations
- Documents stored as normalized maps (`blocksById`, `connectionsById`) to allow O(1) updates.
- Canvas uses virtualization for large graphs (measure block positions, only render visible). Start with simple absolute layout using CSS transforms + GPU acceleration; upgrade to virtualization if needed.
- Debounce expensive computations (codegen, validation) and memoize selectors via custom hooks.

## Testing Plan
- Parser/codegen round-trip tests for representative constructs (variables, control flow, try/catch, functions, nested containers, built-in API calls).
- Block validation tests to ensure port compatibility matrix.
- UI component tests (Vitest + React Testing Library) for palette, inspector, code preview.

## Next Steps
1. Scaffold pnpm workspace with `core` and `web` packages, configure Vite, Tailwind, ESLint, Vitest.
2. Implement core data types, block registry, and minimal parser/codegen pipeline (Program + Function + Expression).
3. Build canvas MVP with React DnD; load sample workflow via parser, render blocks.
4. Expand block library and containers to cover entire language, iteratively verifying with demo scripts.
5. Add inspector forms, validation, undo/redo, keyboard navigation, accessibility polish.
6. Document block authoring workflow in `docs/block-authoring.md`.
