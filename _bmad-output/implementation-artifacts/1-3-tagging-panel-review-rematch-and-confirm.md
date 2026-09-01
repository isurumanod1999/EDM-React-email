# Story 1.3: Tagging panel — review, rematch, and confirm

Status: done

## Story

As an EDM builder,  
I want a builder UI to review proposed mappings, rematch or clear rows, and confirm before any write,  
so that wrong auto-matches cannot silently land on the wrong CTA or image.

## Acceptance Criteria

1. Tagging panel shows FINAL URL, URL Label, Alt Text, status, proposed target
2. Unmatched rows and unmatched targets visible
3. Rematch / clear / leave unapplied supported
4. Confirm marks `confirmed` in session only — props unchanged until apply
5. Skipped-row warnings; assembly flows unchanged

## Tasks

- [x] `TaggingPanel.tsx` replaces minimal upload dump
- [x] Wired in `BuilderToolbar`
- [x] Rematch select, rematch-all, confirm proposed, clear

## Dev Agent Record

### Completion Notes

Panel opens after parse; client-side match via `discoverLinkableTargets` / `matchTaggingRows`.
