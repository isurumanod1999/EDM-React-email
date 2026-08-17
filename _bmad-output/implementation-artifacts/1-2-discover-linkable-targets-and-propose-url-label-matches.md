# Story 1.2: Discover linkable targets and propose URL Label matches

Status: done

## Story

As an EDM builder,  
I want the tool to list clickable targets on my template and propose which tagging row maps to which target using URL Label,  
so that I do not have to guess destinations from FINAL URL alone.

## Acceptance Criteria

1. Linkable targets discovered with ids `{blockId}:{propKey}`, social `{blockId}:social:N:url`, and Figma tree `{blockId}:tree:path:href`
2. Primary match uses normalized URL Label equality (+ unique fuzzy / ordered CTA fallback); ambiguous/zero → `unmatched`
3. Proposal status `proposed | unmatched | skipped`; skipped excluded from apply candidates
4. No template props mutated during match
5. Tests cover exact match, unmatched, skipped; `npm run verify` green

## Tasks

- [x] `discoverTargets.ts` + tests
- [x] `matchRows.ts` + tests
- [x] Types extended for `unmatched` / `targetId`

## Dev Agent Record

### Completion Notes

Shipped discover + match without importing React registry (static URL field catalog). Figma AST href carriers included for real post-compose templates.
