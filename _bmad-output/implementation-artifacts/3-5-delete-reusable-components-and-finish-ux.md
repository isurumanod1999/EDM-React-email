# Story 3.5: Delete reusable components and finish UX

Status: done

## Story

As an EDM builder, I want to remove unused saved components and understand why used ones cannot be removed, so that the shared library stays clean without invalidating templates.

## Acceptance Criteria

1. **Given** a user-created reusable item **When** delete is chosen **Then** confirmation names the item.
2. **Given** no current or saved template uses it **When** confirmed **Then** the item disappears from the palette.
3. **Given** the current unsaved canvas uses it **When** delete is chosen **Then** deletion is blocked client-side.
4. **Given** a persisted template uses it **When** delete reaches the server **Then** deletion is blocked and blocking template names are shown.
5. **Given** all placements are removed and templates saved **When** delete is retried **Then** deletion succeeds.
6. **Given** completion **When** verification runs **Then** tests pass, docs describe the workflow, and sprint/handoff records are current.

## Tasks / Subtasks

- [x] Add delete button and confirmation to reusable items only.
- [x] Add current-canvas provenance check.
- [x] Surface server conflict and general failure messages.
- [x] Document save/reuse/delete behavior.
- [x] Run `npm run verify` and complete BMad records.

## Dev Notes

- Built-in entries never show a delete action.
- No asset garbage collection.
- Gate: `npm run verify`.

### Completion Notes List

- Palette ✕ is only on reusable rows; built-ins have no delete control.
- Client blocks delete when the open canvas has `sourceSavedComponentId`; server 409 lists saved template names.
- Workflow documented in `docs/BUILDER.md`; HANDOFF and sprint status updated.

### File List

- `src/builder/components/ComponentPalette.tsx`
- `src/builder/store/builderStore.ts`
- `docs/BUILDER.md`
- `_bmad-output/planning-artifacts/HANDOFF.md`
- `_bmad-output/implementation-artifacts/3-5-delete-reusable-components-and-finish-ux.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-08-25: Story 3.5 implemented — guarded delete UX, docs, verification.
