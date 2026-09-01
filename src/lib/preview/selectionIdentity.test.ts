import { describe, expect, it } from 'vitest';
import { editorSelectAttrs, fieldPath, parseFieldPath } from './selectionIdentity';

describe('selectionIdentity', () => {
  it('round-trips registry field keys', () => {
    expect(fieldPath('logoSrc')).toBe('field:logoSrc');
    expect(parseFieldPath('field:logoSrc')).toBe('logoSrc');
    expect(parseFieldPath('0.1.2')).toBeNull();
    expect(parseFieldPath(null)).toBeNull();
  });

  it('emits editor attrs only when editable with a block id', () => {
    expect(editorSelectAttrs(true, 'blk', fieldPath('title'))).toEqual({
      'data-block-id': 'blk',
      'data-node-path': 'field:title',
    });
    expect(editorSelectAttrs(false, 'blk', fieldPath('title'))).toEqual({});
    expect(editorSelectAttrs(true, undefined, fieldPath('title'))).toEqual({});
  });
});
