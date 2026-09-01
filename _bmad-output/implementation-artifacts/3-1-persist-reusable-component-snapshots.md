# Story 3.1: Persist reusable component snapshots

Status: done

## Story

As an EDM builder, I want reusable component snapshots stored independently from templates, so that I can reuse configured blocks across campaigns.

## Acceptance Criteria

1. **Given** a valid canvas block snapshot **When** it is saved **Then** its component ID, version, label, props, name, description, category, and timestamps persist in `data/saved-components`.
2. **Given** a Figma React Email block **When** it is saved and loaded **Then** its full AST and upload URLs round-trip unchanged.
3. **Given** an invalid document **When** persistence is attempted **Then** Zod validation rejects it before a write.
4. **Given** the application service **When** it accesses storage **Then** it depends on a repository port bound in the composition root.

## Tasks / Subtasks

- [x] Add reusable-component types and validators.
- [x] Add optional `sourceSavedComponentId` provenance to `TemplateBlock`.
- [x] Add repository port and filesystem adapter.
- [x] Add service and container binding.
- [x] Add schema/service/repository tests.

## Dev Notes

- Follow AD-1, AD-2, AD-3, and AD-8.
- Snapshot excludes the source canvas block instance ID.
- Uploaded assets are referenced, not copied or garbage-collected.
- Gate: `npm run verify`.

### Completion Notes List

- Snapshots persist as JSON under `data/saved-components/` via `SavedComponentRepository`.
- `TemplateBlock.sourceSavedComponentId` is optional provenance only; saving a canvas block does not tag the source as a placement.
- Invalid create input fails Zod parse before `repository.save`.

### File List

- `src/lib/schema/savedComponent.ts`
- `src/lib/schema/template.ts`
- `src/lib/schema/validators.ts`
- `src/lib/ports/savedComponentRepository.ts`
- `src/lib/ports/index.ts`
- `src/lib/adapters/filesystem/savedComponentRepository.ts`
- `src/lib/adapters/filesystem/savedComponentRepository.test.ts`
- `src/lib/saved-components/service.ts`
- `src/lib/saved-components/service.test.ts`
- `src/lib/container.ts`
- `_bmad-output/implementation-artifacts/3-1-persist-reusable-component-snapshots.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-08-25: Story 3.1 implemented — reusable snapshot persistence + tests.
