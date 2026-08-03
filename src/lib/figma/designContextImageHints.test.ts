import { describe, expect, it } from 'vitest';

import { findNodeIdsFromDesignHints } from './designContextImageHints';
import type { ParsedFigmaNode } from './parseFigmaNode';

function node(
  id: string,
  type: string,
  name: string,
  width: number,
  height: number,
  children: ParsedFigmaNode[] = []
): ParsedFigmaNode {
  return { id, nodeId: id, type, name, visible: true, width, height, children };
}

const frame = node('5:502', 'FRAME', 'Opening', 600, 576, [
  node('5:503', 'FRAME', 'Copy', 520, 408, [
    node('5:504', 'TEXT', 'Headline', 496, 96),
  ]),
  node('5:505', 'INSTANCE', 'Icon-badge', 56, 56),
]);

const designContext = [
  'Frame: "Opening"',
  'Size: 600×576px',
  '',
  'Structure:',
  '- FRAME "Opening" 600×576px bg=#000000 layout=VERTICAL gap=40',
  '  - FRAME "Copy" 520×408px layout=VERTICAL',
  '    - TEXT "Headline" 496×96px',
  '  - INSTANCE "Icon-badge" 56×56px bg=#22252f layout=HORIZONTAL',
].join('\n');

describe('findNodeIdsFromDesignHints', () => {
  it('does not force-export the root frame described in design context', () => {
    // The context lists every layer including the root; matching it would
    // flatten the whole design to one PNG.
    expect(findNodeIdsFromDesignHints(frame, designContext)).not.toContain('5:502');
  });

  it('does not force-export large structural layers from design context alone', () => {
    expect(findNodeIdsFromDesignHints(frame, designContext)).not.toContain('5:503');
  });

  it('still auto-exports small icon/badge layers', () => {
    expect(findNodeIdsFromDesignHints(frame, designContext)).toContain('5:505');
  });

  it('honours layers named explicitly in build instructions', () => {
    const ids = findNodeIdsFromDesignHints(frame, undefined, 'export FRAME "Copy" as image');
    expect(ids).toContain('5:503');
  });
});
