/**
 * General design->React Email fidelity checks for intro-copy style sections.
 *
 * Exercises the FULL pipeline (raw Figma node document -> parseFigmaNode ->
 * buildPrimitivesFromFigma) so colour extraction, text casing, heading sizing,
 * paragraph splitting and button styling are all validated together — and for
 * ANY design, not one specific template.
 */
import type { FigmaNodeDocument, FigmaVariable } from '../src/lib/figma/client';
import { parseFigmaNode } from '../src/lib/figma/parseFigmaNode';
import { buildPrimitivesFromFigma } from '../src/lib/figma/figmaPrimitives';
import type { ReactEmailNode } from '../src/lib/figma/types/reactEmailAst';

type Btn = Extract<ReactEmailNode, { type: 'Button' }>;
type Txt = Extract<ReactEmailNode, { type: 'Text' }>;
type Head = Extract<ReactEmailNode, { type: 'Heading' }>;

function collect(tree: ReactEmailNode): ReactEmailNode[] {
  const all: ReactEmailNode[] = [];
  (function walk(n: ReactEmailNode) {
    all.push(n);
    if ('children' in n && Array.isArray(n.children)) n.children.forEach(walk);
  })(tree);
  return all;
}
const buttons = (t: ReactEmailNode) => collect(t).filter((n): n is Btn => n.type === 'Button');
const headings = (t: ReactEmailNode) => collect(t).filter((n): n is Head => n.type === 'Heading');
const texts = (t: ReactEmailNode) => collect(t).filter((n): n is Txt => n.type === 'Text');

const SOLID = (r: number, g: number, b: number) => ({ type: 'SOLID', color: { r, g, b } });
const text = (
  id: string,
  name: string,
  characters: string,
  style: Record<string, unknown>,
  fill: { r: number; g: number; b: number },
  w = 500,
  h = 40
): FigmaNodeDocument => ({
  id,
  name,
  type: 'TEXT',
  visible: true,
  characters,
  style,
  fills: [SOLID(fill.r, fill.g, fill.b)],
  absoluteBoundingBox: { width: w, height: h },
});

function build(doc: FigmaNodeDocument, variables?: Record<string, FigmaVariable>) {
  const parsed = parseFigmaNode(doc, variables);
  return buildPrimitivesFromFigma(parsed, undefined, []);
}

let pass = true;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) pass = false;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
};

// Red ≈ #c3002f (195,0,47)
const RED = { r: 195 / 255, g: 0, b: 47 / 255 };

// ── Scenario A: big heading + multi-paragraph body + single solid red CTA ─────
{
  const doc: FigmaNodeDocument = {
    id: '1:1',
    name: 'IntroCopy',
    type: 'FRAME',
    visible: true,
    absoluteBoundingBox: { width: 600, height: 500 },
    layoutMode: 'VERTICAL',
    counterAxisAlignItems: 'CENTER',
    paddingTop: 48,
    paddingBottom: 48,
    paddingLeft: 48,
    paddingRight: 48,
    itemSpacing: 24,
    fills: [SOLID(0, 0, 0)],
    children: [
      text('1:2', 'Header', 'Big Sale Event', { fontSize: 40, fontWeight: 700, textAlignHorizontal: 'CENTER' }, { r: 1, g: 1, b: 1 }, 500, 50),
      text('1:3', 'Body', 'Para one here.\n\nPara two here.\n\nPara three here.', { fontSize: 16, fontWeight: 400, textAlignHorizontal: 'CENTER' }, { r: 0.9, g: 0.9, b: 0.83 }, 500, 120),
      {
        id: '1:4',
        name: 'CTA Button',
        type: 'FRAME',
        visible: true,
        absoluteBoundingBox: { width: 220, height: 48 },
        cornerRadius: 24,
        layoutMode: 'HORIZONTAL',
        paddingLeft: 40,
        paddingRight: 40,
        paddingTop: 15,
        paddingBottom: 15,
        fills: [SOLID(RED.r, RED.g, RED.b)],
        children: [
          text('1:5', 'Label', 'Shop Now', { fontSize: 14, fontWeight: 600, textAlignHorizontal: 'CENTER', textCase: 'UPPER' }, { r: 1, g: 1, b: 1 }, 120, 18),
        ],
      },
    ],
  };

  const tree = build(doc);
  const btn = buttons(tree)[0];
  const head = headings(tree)[0];
  check('A. one heading present', headings(tree).length === 1, `headingFont=${head?.style?.fontSize}`);
  check('A. heading keeps large font (40px h1)', head?.as === 'h1' && String(head?.style?.fontSize) === '40px');
  check('A. body split into 3 paragraphs', texts(tree).length === 3, `texts=${texts(tree).length}`);
  check('A. exactly one button', buttons(tree).length === 1);
  check('A. button fill = red #c3002f', btn?.style?.backgroundColor === '#c3002f', `bg=${btn?.style?.backgroundColor}`);
  check('A. button label uppercased', btn?.label === 'Shop Now' && btn?.style?.textTransform === 'uppercase', `tt=${btn?.style?.textTransform}`);
  check('A. button hugs content (not full-width)', btn?.style?.width === 'auto', `w=${btn?.style?.width}`);
  check('A. button font size from Figma (14px)', String(btn?.style?.fontSize) === '14px', `fs=${btn?.style?.fontSize}`);
}

// ── Scenario B: button fill bound to a Figma VARIABLE/token (no inline color) ──
{
  const variables: Record<string, FigmaVariable> = {
    'VariableID:brand/red': { resolvedType: 'COLOR', valuesByMode: { m1: RED } },
  };
  const doc: FigmaNodeDocument = {
    id: '2:1',
    name: 'IntroCopy',
    type: 'FRAME',
    visible: true,
    absoluteBoundingBox: { width: 600, height: 300 },
    layoutMode: 'VERTICAL',
    counterAxisAlignItems: 'CENTER',
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    paddingRight: 40,
    itemSpacing: 24,
    fills: [SOLID(0, 0, 0)],
    children: [
      text('2:2', 'Body', 'Some intro copy.', { fontSize: 16, fontWeight: 400, textAlignHorizontal: 'CENTER' }, { r: 0.9, g: 0.9, b: 0.83 }),
      {
        id: '2:4',
        name: 'CTA Button',
        type: 'FRAME',
        visible: true,
        absoluteBoundingBox: { width: 200, height: 48 },
        cornerRadius: 24,
        layoutMode: 'HORIZONTAL',
        paddingLeft: 36,
        paddingRight: 36,
        paddingTop: 14,
        paddingBottom: 14,
        // Token-bound fill: NO inline color, only a variable binding.
        fills: [{ type: 'SOLID', boundVariables: { color: { id: 'VariableID:brand/red' } } }],
        children: [
          text('2:5', 'Label', 'Learn More', { fontSize: 14, fontWeight: 600, textAlignHorizontal: 'CENTER' }, { r: 1, g: 1, b: 1 }, 110, 18),
        ],
      },
    ],
  };

  const tree = build(doc, variables);
  const btn = buttons(tree)[0];
  check('B. token-bound button fill resolves to #c3002f', btn?.style?.backgroundColor === '#c3002f', `bg=${btn?.style?.backgroundColor}`);
}

// ── Scenario C: gradient-filled button → representative (most saturated) stop ──
{
  const doc: FigmaNodeDocument = {
    id: '3:1',
    name: 'IntroCopy',
    type: 'FRAME',
    visible: true,
    absoluteBoundingBox: { width: 600, height: 300 },
    layoutMode: 'VERTICAL',
    counterAxisAlignItems: 'CENTER',
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    paddingRight: 40,
    itemSpacing: 24,
    fills: [SOLID(0, 0, 0)],
    children: [
      text('3:2', 'Body', 'Some intro copy.', { fontSize: 16, fontWeight: 400, textAlignHorizontal: 'CENTER' }, { r: 0.9, g: 0.9, b: 0.83 }),
      {
        id: '3:4',
        name: 'CTA Button',
        type: 'FRAME',
        visible: true,
        absoluteBoundingBox: { width: 200, height: 48 },
        cornerRadius: 24,
        layoutMode: 'HORIZONTAL',
        paddingLeft: 36,
        paddingRight: 36,
        paddingTop: 14,
        paddingBottom: 14,
        fills: [
          {
            type: 'GRADIENT_LINEAR',
            gradientStops: [
              { position: 0, color: { ...RED, a: 1 } },
              { position: 1, color: { r: 0.25, g: 0, b: 0.06, a: 1 } },
            ],
          },
        ],
        children: [
          text('3:5', 'Label', 'Get Started', { fontSize: 14, fontWeight: 600, textAlignHorizontal: 'CENTER' }, { r: 1, g: 1, b: 1 }, 110, 18),
        ],
      },
    ],
  };

  const tree = build(doc);
  const btn = buttons(tree)[0];
  check('C. gradient button resolves to a visible red-ish fill', btn?.style?.backgroundColor === '#c3002f', `bg=${btn?.style?.backgroundColor}`);
}

// ── Scenario D: TWO buttons — primary solid + secondary outline ───────────────
{
  const mkBtn = (id: string, label: string, opts: { fill?: { r: number; g: number; b: number }; stroke?: { r: number; g: number; b: number } }): FigmaNodeDocument => ({
    id,
    name: 'CTA Button',
    type: 'FRAME',
    visible: true,
    absoluteBoundingBox: { width: 240, height: 48 },
    cornerRadius: 24,
    layoutMode: 'HORIZONTAL',
    paddingLeft: 36,
    paddingRight: 36,
    paddingTop: 14,
    paddingBottom: 14,
    fills: opts.fill ? [SOLID(opts.fill.r, opts.fill.g, opts.fill.b)] : [],
    strokes: opts.stroke ? [SOLID(opts.stroke.r, opts.stroke.g, opts.stroke.b)] : undefined,
    strokeWeight: opts.stroke ? 2 : undefined,
    children: [
      text(`${id}-t`, 'Label', label, { fontSize: 14, fontWeight: 600, textAlignHorizontal: 'CENTER' }, opts.fill ? { r: 1, g: 1, b: 1 } : { r: 1, g: 1, b: 1 }, 120, 18),
    ],
  });

  const doc: FigmaNodeDocument = {
    id: '4:1',
    name: 'IntroCopy',
    type: 'FRAME',
    visible: true,
    absoluteBoundingBox: { width: 600, height: 360 },
    layoutMode: 'VERTICAL',
    counterAxisAlignItems: 'CENTER',
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    paddingRight: 40,
    itemSpacing: 16,
    fills: [SOLID(0, 0, 0)],
    children: [
      text('4:2', 'Body', 'Pick an option below.', { fontSize: 16, fontWeight: 400, textAlignHorizontal: 'CENTER' }, { r: 0.9, g: 0.9, b: 0.83 }),
      {
        id: '4:3',
        name: 'CTA',
        type: 'FRAME',
        visible: true,
        absoluteBoundingBox: { width: 240, height: 120 },
        layoutMode: 'VERTICAL',
        counterAxisAlignItems: 'CENTER',
        itemSpacing: 12,
        children: [
          mkBtn('4:4', 'Buy Now', { fill: RED }),
          mkBtn('4:5', 'Learn More', { stroke: { r: 1, g: 1, b: 1 } }),
        ],
      },
    ],
  };

  const tree = build(doc);
  const btns = buttons(tree);
  check('D. two buttons emitted', btns.length === 2, `count=${btns.length}`);
  check('D. primary button is solid red', btns[0]?.style?.backgroundColor === '#c3002f', `bg=${btns[0]?.style?.backgroundColor}`);
  check('D. secondary button is outline (has border, no solid fill)', !!btns[1]?.style?.border && (btns[1]?.style?.backgroundColor === 'transparent' || btns[1]?.style?.backgroundColor === undefined), `bg=${btns[1]?.style?.backgroundColor}, border=${btns[1]?.style?.border}`);
}

// ── Scenario E: mixed-case CTA with a NON-brand (dark gray) fill ──────────────
// Guards against hardcoded brand labels / colors / forced uppercase. Whatever
// the design says is what must come out.
{
  const GRAY = { r: 0.227, g: 0.227, b: 0.227 }; // ≈ #3a3a3a
  const doc: FigmaNodeDocument = {
    id: '5:1',
    name: 'Opening',
    type: 'FRAME',
    visible: true,
    absoluteBoundingBox: { width: 600, height: 360 },
    layoutMode: 'VERTICAL',
    counterAxisAlignItems: 'CENTER',
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    paddingRight: 40,
    itemSpacing: 32,
    fills: [SOLID(0, 0, 0)],
    children: [
      text('5:2', 'Body', 'Some intro copy that flows on one line.', { fontSize: 16, fontWeight: 400, textAlignHorizontal: 'CENTER' }, { r: 1, g: 1, b: 1 }),
      {
        id: '5:3',
        name: 'CTA',
        type: 'FRAME',
        visible: true,
        absoluteBoundingBox: { width: 200, height: 56 },
        cornerRadius: 28,
        layoutMode: 'HORIZONTAL',
        paddingLeft: 36,
        paddingRight: 36,
        paddingTop: 16,
        paddingBottom: 16,
        fills: [SOLID(GRAY.r, GRAY.g, GRAY.b)],
        children: [
          text('5:4', 'Label', 'See all offers', { fontSize: 16, fontWeight: 400, textAlignHorizontal: 'CENTER' }, { r: 1, g: 1, b: 1 }, 130, 20),
        ],
      },
    ],
  };

  const tree = build(doc);
  const btn = buttons(tree)[0];
  check('E. label is the real Figma text (not a hardcoded phrase)', btn?.label === 'See all offers', `label=${btn?.label}`);
  check('E. mixed-case label is NOT force-uppercased', btn?.style?.textTransform === undefined, `tt=${btn?.style?.textTransform}`);
  check('E. fill is the real dark-gray (#3a3a3a), not brand red', btn?.style?.backgroundColor === '#3a3a3a', `bg=${btn?.style?.backgroundColor}`);
}

// ── Scenario F: line breaks vs paragraph gaps ─────────────────────────────────
// "<Name>," sits tight above its sentence (single \n); real paragraph gaps use
// blank lines (\n\n). Single breaks must NOT create extra paragraph blocks.
{
  const doc: FigmaNodeDocument = {
    id: '6:1',
    name: 'IntroCopy',
    type: 'FRAME',
    visible: true,
    absoluteBoundingBox: { width: 600, height: 400 },
    layoutMode: 'VERTICAL',
    counterAxisAlignItems: 'CENTER',
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    paddingRight: 40,
    fills: [SOLID(0, 0, 0)],
    children: [
      text(
        '6:2',
        'Body',
        '<Name>,\nFirst sentence of paragraph one.\n\nSecond paragraph here.\n\nThird paragraph here.',
        { fontSize: 16, fontWeight: 400, textAlignHorizontal: 'CENTER' },
        { r: 1, g: 1, b: 1 },
        500,
        160
      ),
    ],
  };

  const tree = build(doc);
  const ts = texts(tree);
  check('F. blank lines → 3 paragraph blocks (single \\n stays tight)', ts.length === 3, `texts=${ts.length}`);
  check('F. greeting line break preserved inside first block', String(ts[0]?.content ?? '').includes('<Name>,\nFirst sentence'), `p0=${JSON.stringify(ts[0]?.content)}`);
}

console.log(pass ? '\nALL FIDELITY CHECKS PASSED' : '\nSOME FIDELITY CHECKS FAILED');
process.exit(pass ? 0 : 1);
