# Story 2.2–2.6: React code editor (parse → round-trip → panel → apply → restructure)

Status: done

Completed 2026-08-17 as a continuous Amelia run after 2.1.

## Delivered

| Story | Outcome |
|-------|---------|
| 2.2 Parse | `parseBlocks` via acorn + acorn-jsx; whitelist; CodeViewParseError line/col |
| 2.3 Round-trip | `roundTrip.test.ts` — kitchen sink + real template `0929ded6-…` |
| 2.4 Panel | Toolbar **Code** → CodeMirror 6 (lazy, ssr:false) |
| 2.5 Apply | Debounced parse → `replaceBlocks` on store; invalid keeps last good canvas |
| 2.6 Restructure | Column move + block reorder + duplicate-id rejection tests |

## File List

- `src/lib/codeview/*` (print, parse, canonicalize, tests)
- `src/builder/components/code/CodePanel.tsx`
- `src/builder/components/code/CodeEditor.tsx`
- `src/builder/store/builderStore.ts` (`replaceBlocks`)
- `src/builder/components/BuilderToolbar.tsx`
- `src/builder/builder.css`
- `package.json` (acorn, acorn-jsx, @uiw/react-codemirror, @codemirror/*)

## Follow-up: readability pass (2026-08-17)

Feedback: the editor was too small and the printed code too dense to scan.

- Printer emits plain JSX string attributes (`content="Hi"`) instead of always
  wrapping in expressions. Expression form is kept only for values containing
  quotes, `&`, angle brackets, braces, backslashes or newlines — JSX attribute
  strings have no escapes and decode HTML entities, so those must stay literal.
- Elements wider than 100 chars break to one attribute per line; an attribute
  whose object literal still overflows expands one key per line.
- Style objects print spaced: `style={{ padding: 24, color: "#000" }}`.
- Panel is now a full-screen modal (`min(1500px, 96vw)` × `min(94vh, 1100px)`)
  rendered through a portal, with Esc-to-close and a backdrop.
- Split layout: live preview left, code right, with a draggable divider
  (22–75%, persisted) and a **Split / Code only** switch. The preview reuses
  `useTemplatePreview` against the store, so it follows applied code edits with
  no separate render path. Below 900px the split collapses to code only.
- Toolbar adds font size (11–20px, persisted), line wrap toggle, **Format**
  (parse → canonical re-print), **Reset**, and a synced/editing/error status pill.
- CodeMirror + `@codemirror/lang-javascript` moved behind `CodeMirrorEditor.tsx`
  so neither lands in the main builder bundle.

New tests: one-line vs wrapped output, and an entity/ampersand round-trip guard.

## How to use

1. Open a template in the builder
2. Click **Code** in the toolbar
3. Edit structured JSX; on valid parse the canvas updates (~450ms debounce)
4. Invalid code shows line/column error and does not mutate the canvas
5. **Format** re-prints canonically; **Reset** discards edits and reprints from canvas
