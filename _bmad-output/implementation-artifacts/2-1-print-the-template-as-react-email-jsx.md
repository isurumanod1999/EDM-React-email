# Story 2.1: Print the template as React Email JSX

Status: done

<!-- Epic mapping: Story 1.1 in epics-react-code-editor.md; sprint key 2-1-* avoids collision with tagging epic-1. -->

## Story

As an EDM builder,
I want to see generated React Email JSX for my whole template,
So that I can understand what the tool actually built from my Figma design.

## Acceptance Criteria

1. **Given** an open template containing both `figma-react-email` blocks and registry blocks **When** `printBlocks(blocks)` runs **Then** it returns a single JSX document where each block is a `<Block id component label …props>` element (FR1, AD-21)
2. **And** `figma-react-email` blocks nest their `tree` as exactly one child AST element; registry blocks are self-closing with props as attributes (FR8)
3. **And** every scalar prop is an attribute and every style is a literal-only object expression (AD-22)
4. **And** output is deterministic — printing the same document twice is byte-identical
5. **And** indentation is stable and the document is human-readable
6. **And** unit tests cover all 11 node types including `mobileStyle`, `html`, `mobileContent`, `mobileHtml`, `mobileLabel`, `className`, `align`, `isIcon`, `fullBleed`, `containerStyle`, and `as`

## Tasks / Subtasks

- [x] Task 1: Module skeleton + types (AC: 1)
  - [x] Create `src/lib/codeview/types.ts` with reserved Block attrs and print options
  - [x] Export public API from `src/lib/codeview/index.ts`
- [x] Task 2: Style / value printers (AC: 3)
  - [x] `styleLiteral.ts` — print `CSSProperties` as `{key:value,…}` with stable key order
  - [x] Attribute value encoding for strings (escape quotes), numbers, booleans, null skip
  - [x] Nested non-style objects/arrays as JSX expression literals (JSON-compatible) for registry props like `socialLinks`
- [x] Task 3: AST node printer (AC: 1, 2, 5, 6)
  - [x] `printNode(node, indent)` covering all 11 `ReactEmailNode` types
  - [x] Children recurse; self-closing when no children (Img, Hr, Spacer, Text without html as attrs-only, etc.)
  - [x] Text/Heading/Link/Button: `content`/`html`/`label`/`mobile*` as attributes (not children) per AD-22
- [x] Task 4: Block printer (AC: 1, 2, 4)
  - [x] `printBlocks(blocks: TemplateBlock[]): string`
  - [x] Reserved attrs: `id`, `component` (=componentId), `label`
  - [x] Skip editor-only props: `editable`, `blockId`, `emitResponsiveStyles`, `tree` (tree becomes child)
  - [x] `figma-react-email`: open Block + print tree child + close Block
  - [x] Other components: self-closing Block with remaining props as attributes
  - [x] Include `componentVersion` as attribute when present
- [x] Task 5: Tests (AC: 4, 5, 6)
  - [x] `printBlocks.test.ts` — all 11 node types + optional props fixture
  - [x] Determinism: print twice identical
  - [x] Mixed template: one figma-react-email + one header registry block

## Dev Notes

### Grounding

There is **no JSX source in the product today**. Blocks persist as JSON; `figma-react-email` stores `props.tree: ReactEmailNode`. This story builds the **printer only** — parser is story 2.2. Do not add CodeMirror, acorn, or UI yet.

### Projection grammar (AD-21 / AD-22)

```jsx
<Block id="…" component="figma-react-email" label="hero" sourceFrame="…" mobileFrame="…" hideBorders={false}>
  <Section style={{padding:24}}>
    <Row>
      <Column>
        <Text content="Hello" style={{fontSize:16}} />
      </Column>
    </Row>
  </Section>
</Block>

<Block id="…" component="header" label="header" componentVersion={1} logoUrl="https://…" logoAlt="Nissan" />
```

- Scalar props → attributes
- `style` / `mobileStyle` / `containerStyle` → `style={{…}}` object expressions with **literals only**
- Child AST nodes → JSX children (only under figma tree)
- Never put `content`/`html` as element children — always attributes (four text fields would be ambiguous)

### Node type union

[Source: `src/lib/figma/types/reactEmailAst.ts`]

| Type | Key props |
|------|-----------|
| Section, Container, Row | style?, mobileStyle?, children |
| Column | + className? |
| Text, Heading | content, html?, mobileContent?, mobileHtml?, href?, style?, mobileStyle?; Heading + as? |
| Img | src, mobileSrc?, width?, height?, alt?, href?, className?, align?, isIcon?, fullBleed?, mobileStyle? |
| Link | href, content, html?, mobile*, style?, mobileStyle? |
| Button | href, label, mobileLabel?, style?, containerStyle?, mobileStyle? |
| Hr | style?, mobileStyle? |
| Spacer | height |

### Props to skip on figma-react-email Block

`tree` (emitted as child), `editable`, `blockId`, `emitResponsiveStyles` (editor/runtime only).

### Project structure

```
src/lib/codeview/
  types.ts
  styleLiteral.ts
  printNode.ts      # or printAst.ts
  printBlocks.ts
  index.ts
  printBlocks.test.ts
```

Follow existing lib patterns: pure functions, vitest colocated, no React imports in printer.

### Testing

- Vitest (see `src/lib/tagging/*.test.ts`, `src/lib/figma/*.test.ts`)
- No JSX transform needed if tests stay in `.ts` and only assert strings
- Run: `npx vitest run src/lib/codeview`

### Dependencies

**None for this story.** Do not install acorn / CodeMirror yet (stories 2.2 / 2.4).

### Out of scope

- Parse / round-trip (2.2, 2.3)
- UI panel (2.4)
- Store apply (2.5)
- Restructure semantics (2.6) — printer must still emit nestable Column children so later stories can move nodes

### References

- [Source: `_bmad-output/planning-artifacts/epics-react-code-editor.md` — Story 1.1, AD-20…AD-28]
- [Source: `src/lib/figma/types/reactEmailAst.ts`]
- [Source: `src/lib/schema/template.ts` — TemplateBlock]
- [Source: `src/lib/registry/definitions.ts` — figma-react-email + header defaults]
- [Source: `src/components/email/FigmaReactEmailBlock.tsx` — runtime interpreter (do not change)]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia / bmad-dev-story)

### Debug Log References

### Completion Notes List

- Implemented `printBlocks` / `printNode` / `styleLiteral` under `src/lib/codeview/`.
- AC1–6 covered by 6 vitest cases (registry self-close, figma child nest, determinism, all 11 node types + optional props, mixed doc, quote escaping).
- Editor-only props (`editable`, `blockId`, `emitResponsiveStyles`) omitted; `tree` emitted as child only.
- No new npm deps (parser/editor deferred to 2.2 / 2.4).

### File List

- `src/lib/codeview/types.ts`
- `src/lib/codeview/styleLiteral.ts`
- `src/lib/codeview/printNode.ts`
- `src/lib/codeview/printBlocks.ts`
- `src/lib/codeview/index.ts`
- `src/lib/codeview/printBlocks.test.ts`
- `_bmad-output/implementation-artifacts/2-1-print-the-template-as-react-email-jsx.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-08-17: Story 2.1 implemented — template→JSX printer + tests.