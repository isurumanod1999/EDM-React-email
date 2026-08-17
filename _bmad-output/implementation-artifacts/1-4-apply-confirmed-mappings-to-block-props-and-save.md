# Story 1.4: Apply confirmed mappings to block props and save

Status: done

## Story

As an EDM builder,  
I want confirmed FINAL URLs and Alt Text written onto the matched block props and saved on the template,  
so that preview/export use the real campaign links without a side URL table.

## Acceptance Criteria

1. `/api/tagging/apply` writes finalUrl to URL prop and altText to paired alt when present
2. URL Label does not overwrite CTA/button text
3. FINAL URL stored literally including CRM tokens
4. Persist via TemplateService; reload shows same props
5. Partial apply with warnings; tests cover writes / no CTA clobber / tokens

## Tasks

- [x] `applyMappings.ts` + tests
- [x] `POST /api/tagging/apply`
- [x] Service `apply` + panel Apply & save

## Dev Agent Record

### Completion Notes

Supports registry URL props, social item urls, and Figma tree href/alt writes.
