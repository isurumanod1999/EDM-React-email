---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
status: draft
validatedAt: 2026-08-17
inputDocuments:
  - Codebase exploration (src/lib/figma/types/reactEmailAst.ts, src/components/email/FigmaReactEmailBlock.tsx, src/lib/schema/template.ts, src/builder/store/builderStore.ts)
  - _bmad-output/planning-artifacts/architecture/architecture-edm-react-email-tool-2026-07-28/ARCHITECTURE-SPINE.md
outputFile: _bmad-output/planning-artifacts/epics-react-code-editor.md
---

# EDM react email tool - Epic Breakdown (React code editor)

## Overview

This document breaks down the **in-tool React code editor**: a builder panel that projects the open template as React Email JSX, lets the user edit that code, and applies valid edits back onto the template so the canvas updates live.

### Grounding finding (drives the whole design)

There is **no React source code in this product today**. A Figma import produces a `ReactEmailNode` JSON AST stored at `block.props.tree`, interpreted at runtime by a `switch` in `FigmaReactEmailBlock.tsx`. Export emits HTML + `img/` only. This epic therefore builds a **code generator and a code parser**, not a viewer over something that already exists.

### The accepted constraint

The editable language is the **closed subset** the AST can represent — 11 node types (`Section`, `Container`, `Row`, `Column`, `Text`, `Heading`, `Img`, `Link`, `Button`, `Hr`, `Spacer`) plus block wrappers. Hooks, `import`s, `.map()`, conditionals and user-defined components have no representation in a JSON tree and are rejected with a clear error. Supporting them would require executing user code, which is out of scope and a security non-starter (AD-24). The user has accepted this constraint.

Baseline Epic 1–2 / F1–F4 remain in `epics.md`; tagging remains in `epics-tagging-url-import.md`. Both are out of scope here.

## Requirements Inventory

### Functional Requirements

FR1: From the builder, the user can open a code panel showing generated React Email JSX for the **entire open template**, not just one block (CAP-1).
FR2: The generated code reflects current canvas state; reopening or refreshing regenerates it from the template document (CAP-1, AD-20).
FR3: The code is editable in-panel with syntax highlighting (CAP-2).
FR4: A valid edit parses back into template blocks and the canvas re-renders to match (CAP-3).
FR5: Invalid or unsupported code surfaces a precise error with line/column, and the template/canvas is left unchanged (CAP-3, AD-25).
FR6: Block identity (`block.id`) survives the round trip so selection, tagging targets, and undo stay stable (CAP-4, AD-26).
FR7: The user can restructure in code — reorder blocks, move nodes between columns, and move nodes between blocks (CAP-4).
FR8: Registry blocks (`header`, `hero`, `cta-banner`, …) project with editable props but structurally opaque internals; `figma-react-email` blocks are fully editable (CAP-1, AD-28).
FR9: Code edits and visual-customizer edits interoperate — the template document stays the single source of truth and the panel refreshes when the canvas changes elsewhere (CAP-3, AD-20).
FR10: No user code is ever executed; parsing is static analysis only (AD-24).
FR11: Code is a working surface only — it is never persisted on the template and there is no `.tsx` export/eject in this epic.

### NonFunctional Requirements

NFR1: Parse with **acorn + acorn-jsx** (~80KB core, ESTree) — not `@babel/parser` (~1MB) (AD-23).
NFR2: Editor is **CodeMirror 6**, lazy-loaded via `next/dynamic` with `ssr: false`; Monaco is rejected on bundle size and web-worker/CSP cost (AD-27).
NFR3: Parser and editor chunks must not load until the panel is opened.
NFR4: **Round-trip invariant:** `parse(print(doc))` deep-equals `doc` for every node type and every optional prop (`mobileStyle`, `html`, `mobileContent`, `mobileHtml`, `mobileLabel`, `className`, `align`, `isIcon`, `fullBleed`, `containerStyle`, `as`).
NFR5: No `eval`, no `new Function`, no dynamic import of user content.
NFR6: Persist only via the existing template document + `TemplateRepository`; no parallel code store (AD-20).
NFR7: `npm run verify` remains green (typecheck, lint, boundaries, secrets, tests).

### Additional Requirements

- Add dependencies: `acorn`, `acorn-jsx`, `@uiw/react-codemirror`, `@codemirror/lang-javascript`.
- Module layout: `src/lib/codeview/{types,printBlocks,parseBlocks,styleLiteral,nodeSchema}.ts`; UI `src/builder/components/code/{CodePanel,CodeEditor}.tsx`.
- **No new API route** — printing and parsing are pure and run client-side.
- Projection grammar, uniform for every block:
  - `<Block id="…" component="figma-react-email" label="…" sourceFrame="…">` + exactly one child AST node
  - `<Block id="…" component="header" label="…" logoUrl="…" />` — non-reserved attributes are the props
  - Reserved attribute names: `id`, `component`, `label`
- Scalar props are JSX **attributes**; only child AST nodes are JSX **children** (AD-22).
- Style props are object expressions with **literal values only**: `style={{fontSize:'10px',margin:0}}`.
- Architecture decisions AD-20…AD-28 (below) bind implementation; inherit AD-1…AD-11.
- Non-goals: `.tsx` export/eject, arbitrary React (hooks/imports/loops/custom components), TypeScript checking in-panel, collaborative editing, a code-level undo stack separate from builder undo, editing registry component internals.

### Architecture Decisions

AD-20: The code panel is a **projection**. The template document remains the single source of truth; generated code is never persisted.
AD-21: Every block projects through a uniform `<Block>` wrapper carrying `id`, `component`, `label`.
AD-22: Scalar props as attributes, child nodes as children — chosen over `<Text>content</Text>` because `content`/`html`/`mobileContent`/`mobileHtml` are four text-bearing fields that would be ambiguous as children. Trades a little React naturalness for an exact round trip.
AD-23: `acorn` + `acorn-jsx` for parsing; a hand-written printer (~11 node types) rather than `@babel/generator`, for full control over round-trip-stable output.
AD-24: **Static parse only.** Element names, attribute names, and style keys are whitelisted; style values must be literals. Identifiers, spreads, template expressions and calls are rejected.
AD-25: A failed parse never mutates the template. The last good state is retained and errors carry line/column.
AD-26: `block.id` round-trips. Missing ids are generated; duplicate ids are a parse error.
AD-27: CodeMirror 6, lazy-loaded, `ssr: false`. No Monaco.
AD-28: Registry blocks are props-editable but structurally opaque — their internals are owned by their React components, not the AST.

### FR Coverage Map

FR1: Epic 1 — Whole-template code projection
FR2: Epic 1 — Regenerate from document
FR3: Epic 1 — Editable panel with highlighting
FR4: Epic 1 — Valid edit updates canvas
FR5: Epic 1 — Errors without mutation
FR6: Epic 1 — Stable block identity
FR7: Epic 1 — Restructure incl. between columns
FR8: Epic 1 — Registry blocks props-only
FR9: Epic 1 — Interop with visual customizer
FR10: Epic 1 — No code execution
FR11: Epic 1 — No persistence / no eject

## Epic List

### Epic 1: In-tool React code editing with live canvas sync

The builder can read the React Email JSX behind the whole template, edit it, and see the canvas update — within a closed, safely-parseable node set.

**FRs covered:** FR1–FR11
**NFRs:** NFR1–NFR7

---

## Epic 1: In-tool React code editing with live canvas sync

### Story 1.1: Print the template as React Email JSX

As an EDM builder,
I want to see generated React Email JSX for my whole template,
So that I can understand what the tool actually built from my Figma design.

**Acceptance Criteria:**

**Given** an open template containing both `figma-react-email` blocks and registry blocks
**When** the printer runs
**Then** it returns a single JSX document where each block is a `<Block id component label …props>` element (FR1, AD-21)
**And** `figma-react-email` blocks nest their `tree` as exactly one child AST element; registry blocks are self-closing with props as attributes (FR8)
**And** every scalar prop is an attribute and every style is a literal-only object expression (AD-22)
**And** output is deterministic — printing the same document twice is byte-identical
**And** indentation is stable and the document is human-readable
**And** unit tests cover all 11 node types including `mobileStyle`, `html`, `mobileContent`, `mobileHtml`, `mobileLabel`, `className`, `align`, `isIcon`, `fullBleed`, `containerStyle`, and `as`

### Story 1.2: Parse edited JSX back into template blocks

As an EDM builder,
I want my code edits turned back into the template structure,
So that what I type becomes what the canvas shows.

**Acceptance Criteria:**

**Given** a JSX document produced by Story 1.1 and then edited
**When** parse runs
**Then** `acorn` + `acorn-jsx` produce an ESTree and the mapper walks JSX elements into `TemplateBlock[]` (FR4, AD-23)
**And** element names, attribute names, and style keys are validated against a whitelist; unknown ones are rejected with line/column (AD-24)
**And** style values must be literals — identifiers, spreads, template expressions and calls are rejected (AD-24)
**And** hooks, `import`s, `.map()`, conditionals and custom components are rejected with a message naming the unsupported construct
**And** no `eval`, `new Function`, or dynamic import is used anywhere in the path (FR10, NFR5)
**And** a `figma-react-email` `<Block>` with zero or multiple child elements is a parse error
**And** tests cover each rejection case and assert the produced blocks match expected JSON

### Story 1.3: Prove the round trip

As an EDM builder,
I want to trust that opening and closing the code panel never damages my template,
So that I can use code editing on real campaign work.

**Acceptance Criteria:**

**Given** a corpus of templates including a real Figma-imported multi-column template from `data/templates/`
**When** `parse(print(doc))` runs
**Then** the result deep-equals the original `blocks` array for every fixture (NFR4)
**And** the invariant holds for every node type and every optional prop listed in NFR4
**And** printing is idempotent: `print(parse(print(doc))) === print(doc)`
**And** a fixture with rich-text `html` containing quotes, angle brackets and entities survives unchanged
**And** these tests are the acceptance gate for the epic — Stories 1.4–1.6 must not regress them

### Story 1.4: Code panel in the builder

As an EDM builder,
I want a code panel with syntax highlighting next to my canvas,
So that reading and editing the code is comfortable.

**Acceptance Criteria:**

**Given** an open template
**When** I open the code panel from the builder toolbar
**Then** CodeMirror 6 renders the printed document with JSX highlighting (FR3, AD-27)
**And** the editor and the parser load only on open, via `next/dynamic` with `ssr: false` (NFR2, NFR3)
**And** the panel matches builder theming and is readable against the dark chrome
**And** parse errors appear inline with line/column and a plain-language message (FR5)
**And** the panel can be closed and reopened, regenerating from the current document (FR2)

### Story 1.5: Apply valid edits to the canvas

As an EDM builder,
I want my valid code edits to update the canvas,
So that code is a real editing surface and not a read-only view.

**Acceptance Criteria:**

**Given** the code panel is open with edited code
**When** the edit parses successfully
**Then** the resulting blocks are written to the builder store and the canvas re-renders (FR4)
**And** a failed parse leaves the template and canvas untouched, retaining the last good state (FR5, AD-25)
**And** parsing is debounced while typing and the document is not reformatted mid-edit
**And** the change participates in existing builder undo/redo
**And** editing the same block through the visual customizer while the panel is open refreshes the code, with unsaved code edits protected by a dirty-state guard (FR9)
**And** applied changes persist through the existing template save path only (NFR6)

### Story 1.6: Restructure across blocks and columns

As an EDM builder,
I want to move content between columns and reorder blocks in code,
So that I can do layout surgery faster than through the form UI.

**Acceptance Criteria:**

**Given** a template with a `Row` containing multiple `Column` nodes
**When** I move a `Text`/`Img` node from one `<Column>` to another and apply
**Then** the canvas reflects the move and the round-trip invariant still holds (FR7)
**And** reordering `<Block>` elements reorders blocks on the canvas
**And** moving a node from one `figma-react-email` block into another is supported
**And** `block.id` is preserved for every block that kept its `id` attribute; a missing `id` gets a generated one and a duplicate `id` is a parse error (FR6, AD-26)
**And** tagging targets resolved from `{blockId}:{propKey}` still resolve after a restructure that preserves ids
**And** registry blocks accept prop edits but reject attempts to add children (FR8, AD-28)

---

**Story count:** 6 · **FR coverage:** FR1–FR11 all mapped · **New deps:** acorn, acorn-jsx, @uiw/react-codemirror, @codemirror/lang-javascript
