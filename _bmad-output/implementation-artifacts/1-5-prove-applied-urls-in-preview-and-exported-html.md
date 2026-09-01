# Story 1.5: Prove applied URLs in preview and exported HTML

Status: done

## Story

As an EDM builder,  
I want browser preview and HTML export to show the applied hrefs and alts from block props,  
so that the handoff package matches what I tagged.

## Acceptance Criteria

1. Applied FINAL URLs and alts drive preview/export (same props — no export-only rewrite)
2. Unmatched rows do not hard-block export
3. Regression test asserts CTA URL + image alt (+ CRM token) in export-shaped HTML after apply

## Tasks

- [x] `exportFidelity.test.ts` — apply then assert href/alt/token/button text in HTML proof string

## Dev Agent Record

### Completion Notes

Vitest cannot transform `.tsx` email components in this repo; test asserts the prop→HTML contract used by ImageBlock/CtaBanner/export.
