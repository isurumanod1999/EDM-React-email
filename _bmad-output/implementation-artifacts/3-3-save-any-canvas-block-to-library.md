# Story 3.3: Save any canvas block to the library

Status: done

## Story

As an EDM builder, I want to save any configured canvas block as reusable, so that repeated Pre-header, Header, and other campaign components do not require another Figma import.

## Acceptance Criteria

1. **Given** any selected canvas block **When** “Save as reusable” is chosen **Then** an accessible modal requests a required unique name and optional description.
2. **Given** valid metadata **When** save succeeds **Then** a deep snapshot is created without the source block instance ID.
3. **Given** a duplicate name or API failure **When** save is attempted **Then** the modal remains open and shows an actionable error.
4. **Given** save succeeds **When** the modal closes **Then** the reusable palette refreshes and the canvas/template is otherwise unchanged.
5. **Given** keyboard-only use **When** the modal opens **Then** focus, Escape, labels, and submit behavior are accessible.

## Tasks / Subtasks

- [x] Add “Save as reusable” block action.
- [x] Add modal with name/description fields.
- [x] Wire create action and loading/error feedback.
- [x] Refresh shared library after success.

## Dev Notes

- Save Figma and customized built-in blocks.
- Source block is not tagged as a placement.
- Gate: `npm run verify`.

### Completion Notes List

- Canvas action is **＋** (**Add to components**) immediately before Duplicate on `BlockItem`.
- Modal uses `useModalA11y` (focus trap, Escape, labels). Duplicate names keep the dialog open.
- Store prepends the created document into `savedComponents` without marking the template dirty.

### File List

- `src/builder/components/BlockItem.tsx`
- `src/builder/components/SaveReusableComponentModal.tsx`
- `src/builder/store/builderStore.ts`
- `_bmad-output/implementation-artifacts/3-3-save-any-canvas-block-to-library.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-08-25: Story 3.3 implemented — save-from-canvas modal and block action.
