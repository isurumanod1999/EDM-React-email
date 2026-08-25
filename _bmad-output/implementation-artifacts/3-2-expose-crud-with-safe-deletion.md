# Story 3.2: Expose CRUD with safe deletion

Status: done

## Story

As an EDM builder, I want reusable-component CRUD to protect components already used by templates, so that deleting library entries cannot silently break campaign provenance.

## Acceptance Criteria

1. **Given** valid input **When** `POST /api/saved-components` runs **Then** a reusable snapshot is created and returned.
2. **Given** stored entries **When** `GET /api/saved-components` runs **Then** they are returned newest first.
3. **Given** an unused entry **When** `DELETE /api/saved-components/:id` runs **Then** it is removed.
4. **Given** one or more saved templates contain `sourceSavedComponentId` **When** delete runs **Then** it returns conflict and identifies blocking template names.
5. **Given** a route request **When** handled **Then** the route validates, calls the service, and shapes the response without storage logic.

## Tasks / Subtasks

- [x] Add collection GET/POST route.
- [x] Add item GET/DELETE route.
- [x] Add service usage scan through `TemplateRepository`.
- [x] Return clear not-found, validation, and conflict responses.
- [x] Cover safe deletion in service tests.

## Dev Notes

- Built-in registry entries are outside this API.
- Deletion does not remove uploaded assets.
- Gate: `npm run verify`.

### Completion Notes List

- Routes are thin: service handles duplicate names, Zod, and in-use scans.
- `DELETE` returns 409 `component_in_use` with blocking template names in the message.
- List order is newest-first in the service so adapters stay consistent.

### File List

- `src/app/api/saved-components/route.ts`
- `src/app/api/saved-components/[id]/route.ts`
- `src/lib/saved-components/service.ts`
- `src/lib/saved-components/service.test.ts`
- `_bmad-output/implementation-artifacts/3-2-expose-crud-with-safe-deletion.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-08-25: Story 3.2 implemented — CRUD routes + guarded delete.
