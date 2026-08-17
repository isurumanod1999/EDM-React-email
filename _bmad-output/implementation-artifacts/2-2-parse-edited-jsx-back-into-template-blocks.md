# Story 2.2: Parse edited JSX back into template blocks

Status: in-progress

<!-- Epic: Story 1.2 in epics-react-code-editor.md -->

## Story

As an EDM builder,
I want my code edits turned back into the template structure,
So that what I type becomes what the canvas shows.

## Acceptance Criteria

1. Given JSX from printBlocks (possibly edited), parse with acorn + acorn-jsx → TemplateBlock[]
2. Whitelist element/attr/style keys; reject unknown with line/column
3. Style values must be literals only
4. Reject hooks, imports, map, conditionals, custom components
5. No eval / new Function
6. figma-react-email Block with 0 or >1 children is a parse error
7. Tests cover rejections and happy-path blocks matching expected JSON

## Tasks / Subtasks

- [ ] Install acorn, acorn-jsx
- [ ] parseBlocks.ts + nodeSchema.ts + evaluateLiteral.ts
- [ ] parseBlocks.test.ts
- [ ] Export from index

## Dev Agent Record

### Completion Notes List

### File List
