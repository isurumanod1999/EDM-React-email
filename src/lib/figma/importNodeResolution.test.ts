import { describe, expect, it } from 'vitest';
import { requireNodeDocument } from './importFromFigma';
import type { FigmaNodeDocument, FigmaNodesResponse } from './client';

const doc = (id: string): FigmaNodeDocument => ({
  id,
  name: `Frame ${id}`,
  type: 'FRAME',
});

const response = (
  nodes: FigmaNodesResponse['nodes'],
  name = 'NSSNAM-1962_Nissan_X-TRAIL Brand e-POWER eDM (Copy)'
): FigmaNodesResponse => ({ name, nodes });

describe('requireNodeDocument', () => {
  it('returns the document when Figma resolved the id', () => {
    const resolved = requireNodeDocument(
      response({ '13692:2174': { document: doc('13692:2174') } }),
      '13692:2174',
      'desktop'
    );

    expect(resolved.id).toBe('13692:2174');
  });

  it('names the id and file when Figma returns a null entry', () => {
    expect(() =>
      requireNodeDocument(response({ '13692:2174': null }), '13692:2174', 'desktop')
    ).toThrow(/desktop frame \(node-id 13692:2174\) is not in "NSSNAM-1962.*Copy\)"/);
  });

  it('fails the mobile frame instead of silently dropping the paired layout', () => {
    const nodes = response({
      '13692:2174': { document: doc('13692:2174') },
      '13692:2387': null,
    });

    expect(() => requireNodeDocument(nodes, '13692:2387', 'mobile')).toThrow(
      /mobile frame \(node-id 13692:2387\)/
    );
  });

  it('calls out a wrong-file link when nothing in the request resolved', () => {
    const nodes = response({ '13692:2174': null, '13692:2387': null });

    expect(() => requireNodeDocument(nodes, '13692:2174', 'desktop')).toThrow(
      /Neither the desktop nor the mobile frame resolved/
    );
  });

  it('tells the user how to re-copy a working link', () => {
    expect(() => requireNodeDocument(response({ '1:2': null }), '1:2', 'desktop')).toThrow(
      /Copy link to selection/
    );
  });
});
