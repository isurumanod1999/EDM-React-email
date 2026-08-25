# Story 3.4: Browse, add, and drag reusable components

Status: done

## Story

As an EDM builder, I want saved components in the component palette, so that I can drag reusable campaign blocks into any template.

## Acceptance Criteria

1. **Given** saved entries **When** the builder loads **Then** a distinct “Reusable Components” section lists them.
2. **Given** a reusable entry **When** it is dragged, double-clicked, or activated with Enter **Then** a fresh canvas block is inserted at the intended position.
3. **Given** a placement **When** it is created **Then** props are deep-cloned, the block ID is fresh, and `sourceSavedComponentId` records provenance.
4. **Given** two placements from one entry **When** one is edited **Then** the other placement and the library snapshot remain unchanged.
5. **Given** loading, empty, or request failure **When** the palette renders **Then** it communicates the correct state without hiding built-ins.

## Tasks / Subtasks

- [x] Extend builder state with saved entries and load/add actions.
- [x] Add reusable palette item and section.
- [x] Extend DnD handling and overlay.
- [x] Preserve keyboard and double-click add behavior.
- [x] Add focused cloning/provenance tests.

## Dev Notes

- Do not mutate runtime registry definitions.
- Reused Figma blocks use the existing renderer unchanged.
- Gate: `npm run verify`.

### Completion Notes List

- Palette section is independent of built-in categories; loading/empty/error states do not hide registry items.
- DnD type `saved-component` inserts via `createBlockFromSavedComponent`.
- Code view round-trip preserves `sourceSavedComponentId`.

### File List

- `src/builder/components/ComponentPalette.tsx`
- `src/builder/components/BuilderEditor.tsx`
- `src/builder/builder.css`
- `src/lib/saved-components/placement.ts`
- `src/lib/saved-components/placement.test.ts`
- `src/lib/codeview/nodeSchema.ts`
- `src/lib/codeview/parseBlocks.ts`
- `src/lib/codeview/canonicalize.ts`
- `src/lib/codeview/selectionIndex.ts`
- `src/lib/codeview/roundTrip.test.ts`
- `_bmad-output/implementation-artifacts/3-4-browse-add-drag-reusable-components.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-08-25: Story 3.4 implemented — reusable palette, DnD, placement clone tests.
