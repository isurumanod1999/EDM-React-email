---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
status: ready-for-development
validatedAt: 2026-08-24
inputDocuments:
  - Reusable Component Library approved implementation plan
  - src/builder/store/builderStore.ts
  - src/builder/components/ComponentPalette.tsx
  - src/builder/components/BuilderEditor.tsx
  - src/lib/schema/template.ts
  - _bmad-output/planning-artifacts/architecture/architecture-edm-react-email-tool-2026-07-28/ARCHITECTURE-SPINE.md
outputFile: _bmad-output/planning-artifacts/epics-reusable-component-library.md
---

# EDM React Email Tool - Epic 3: Reusable Component Library

## Outcome

An EDM builder can save any configured canvas block as a shared reusable component, add it to future templates without importing Figma again, and delete it only when no saved template uses it.

## Functional Requirements

FR1: Save any canvas block, including Figma imports and customized built-ins, as an independent reusable snapshot.
FR2: Require a unique name and allow an optional description for the saved component.
FR3: List shared reusable components separately from immutable built-in registry entries.
FR4: Add a reusable component by drag, double-click, or Enter with a fresh block ID and deep-cloned props.
FR5: Record the reusable-component source on each placement without coupling later edits back to the snapshot.
FR6: Delete unused reusable components after confirmation.
FR7: Block deletion when a saved template or the current unsaved canvas references the component and identify blocking templates.
FR8: Preserve Figma AST and uploaded image references so reuse never calls Figma.

## Non-Functional Requirements

NFR1: Follow AD-1/AD-2/AD-3: thin routes, service-owned rules, repository port, filesystem adapter, composition-root binding.
NFR2: Zod-validate all stored documents and write inputs before side effects (AD-8).
NFR3: Built-in registry entries remain static and cannot be deleted.
NFR4: Reused placements are independent snapshots; editing one never mutates another or the library item.
NFR5: Keyboard access, loading, empty, error, confirmation, and actionable conflict feedback are required.
NFR6: `npm run verify` remains green.

## Scope Decisions

- Shared installation-wide library; no user ownership/authentication in v1.
- Saving does not link the source block; only placements made from the library carry `sourceSavedComponentId`.
- No rename/update/versioning of saved entries in v1.
- No upload asset garbage collection on deletion.

## Story Map

### Story 3.1: Persist reusable component snapshots
Schema, repository port, filesystem adapter, service, and container binding.

### Story 3.2: Expose CRUD with safe deletion
Thin list/create/get/delete routes and persisted-template usage checks.

### Story 3.3: Save any canvas block to the library
Canvas action and accessible name/description modal.

### Story 3.4: Browse, add, and drag reusable components
Store loading, reusable palette section, fresh IDs, deep cloning, and provenance.

### Story 3.5: Delete reusable components and finish UX
Confirm deletion, client/server usage guards, feedback states, tests, and documentation.

## FR Coverage

- FR1–FR2, FR8: Stories 3.1 and 3.3
- FR3–FR5: Story 3.4
- FR6–FR7: Stories 3.2 and 3.5
- NFR1–NFR4: Stories 3.1–3.2
- NFR5: Stories 3.3–3.5
- NFR6: all stories
