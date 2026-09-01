import { describe, expect, it } from 'vitest';
import type { SavedComponentDocument } from '@/lib/schema/savedComponent';
import { createBlockFromSavedComponent } from './placement';

function savedComponent(): SavedComponentDocument {
  return {
    schemaVersion: 1,
    id: 'saved-1',
    name: 'Campaign header',
    category: 'layout',
    componentId: 'figma-react-email',
    componentVersion: 1,
    props: { tree: { type: 'Text', content: 'Original' } },
    createdAt: '2026-08-24T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
  };
}

describe('createBlockFromSavedComponent', () => {
  it('assigns a fresh id and records library provenance', () => {
    const saved = savedComponent();
    const first = createBlockFromSavedComponent(saved, 'block-a');
    const second = createBlockFromSavedComponent(saved, 'block-b');

    expect(first.id).toBe('block-a');
    expect(second.id).toBe('block-b');
    expect(first.sourceSavedComponentId).toBe('saved-1');
    expect(second.sourceSavedComponentId).toBe('saved-1');
    expect(first.label).toBe('Campaign header');
  });

  it('deep-clones props so placements and the snapshot stay independent', () => {
    const saved = savedComponent();
    const first = createBlockFromSavedComponent(saved, 'block-a');
    const second = createBlockFromSavedComponent(saved, 'block-b');

    (first.props.tree as { content: string }).content = 'Edited';

    expect((second.props.tree as { content: string }).content).toBe('Original');
    expect((saved.props.tree as { content: string }).content).toBe('Original');
  });
});
