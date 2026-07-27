/**
 * General design->React Email fidelity checks for intro-copy style sections.
 *
 * Exercises the FULL pipeline (raw Figma node document -> parseFigmaNode ->
 * buildPrimitivesFromFigma) so colour extraction, text casing, heading sizing,
 * paragraph splitting and button styling are all validated together — and for
 * ANY design, not one specific template.
 */
import type { FigmaNodeDocument, FigmaVariable } from '../src/lib/figma/client';
import { parseFigmaNode, type ParsedFigmaNode } from '../src/lib/figma/parseFigmaNode';
import { buildPrimitivesFromFigma } from '../src/lib/figma/figmaPrimitives';
import { detectImageNodeIds } from '../src/lib/figma/detectImageNodes';
import { findNodeIdsFromDesignHints } from '../src/lib/figma/designContextImageHints';
import { nodeMobileStyle, buildFigmaResponsiveCss } from '../src/components/email/FigmaReactEmailBlock';
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
  check('A. button uses the Figma design width (220px), not hug/full', btn?.style?.width === '220px', `w=${btn?.style?.width}`);
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
  check('F. each Figma line break becomes its own paragraph block', ts.length === 4, `texts=${ts.length}`);
  check('F. greeting is its own block', ts[0]?.content === '<Name>,', `p0=${ts[0]?.content}`);
  check('F. greeting stays tight (paragraphSpacing 0 → no gap)', Number(ts[0]?.style?.marginBottom ?? -1) === 0, `mb0=${ts[0]?.style?.marginBottom}`);
  check('F. blank line adds a bigger gap after its paragraph', Number(ts[1]?.style?.marginBottom ?? 0) > 0, `mb1=${ts[1]?.style?.marginBottom}`);
}

// ── Scenario G: fixed-height "CTA" slot stacking 5 variants → only 1 renders ──
// Mirrors the real Nissan "CTA" frame: a 48px-tall clip-content frame holding
// five stacked button variants. Figma shows only the top one (red SEE ALL
// OFFERS); the converter must emit ONE button with the real fill + label.
{
  const variant = (id: string, label: string, fill: { r: number; g: number; b: number }, y: number, txtFill = { r: 1, g: 1, b: 1 }): FigmaNodeDocument => ({
    id,
    name: 'CTA',
    type: 'INSTANCE',
    visible: true,
    absoluteBoundingBox: { x: 0, y, width: 290, height: 48 },
    cornerRadius: 24,
    layoutMode: 'HORIZONTAL',
    paddingLeft: 24,
    paddingRight: 24,
    paddingTop: 12,
    paddingBottom: 12,
    fills: [SOLID(fill.r, fill.g, fill.b)],
    children: [
      { ...text(`${id}-t`, 'Label', label, { fontSize: 14, fontWeight: 700, textAlignHorizontal: 'CENTER' }, txtFill, 150, 24), absoluteBoundingBox: { x: 24, y: y + 12, width: 150, height: 24 } },
    ],
  });

  const B42535 = { r: 180 / 255, g: 37 / 255, b: 53 / 255 };
  const doc: FigmaNodeDocument = {
    id: '7:1',
    name: 'CTA',
    type: 'FRAME',
    visible: true,
    clipsContent: true,
    layoutMode: 'VERTICAL',
    itemSpacing: 24,
    absoluteBoundingBox: { x: 0, y: 0, width: 290, height: 48 },
    children: [
      variant('7:2', 'SEE ALL OFFERS', B42535, 0),
      variant('7:3', 'Learn More', { r: 0.94, g: 0.94, b: 0.94 }, 72, { r: 0, g: 0, b: 0 }),
      variant('7:4', 'RESERVE YOURS ONLINE', { r: 1, g: 1, b: 1 }, 144, { r: 0, g: 0, b: 0 }),
      variant('7:5', 'See all offers', B42535, 216),
      variant('7:6', 'Request a quote', { r: 0.94, g: 0.94, b: 0.94 }, 288, { r: 0, g: 0, b: 0 }),
    ],
  };

  const tree = build(doc);
  const bs = buttons(tree);
  check('G. clipped CTA slot emits exactly ONE button (not 5)', bs.length === 1, `count=${bs.length}`);
  check('G. the visible (top) variant wins — red #b42535', bs[0]?.style?.backgroundColor === '#b42535', `bg=${bs[0]?.style?.backgroundColor}`);
  check('G. label is the top variant text', bs[0]?.label === 'SEE ALL OFFERS', `label=${bs[0]?.label}`);
  check('G. CTA renders at the Nissan design width (290px)', bs[0]?.style?.width === '290px', `w=${bs[0]?.style?.width}`);
}

// ── Scenario H: numbered legal disclaimer → one spaced paragraph per item ─────
// Every Nissan campaign ships a long numbered disclaimer as a single TEXT node
// with `\n` between items. It must render as separate, spaced paragraphs (with
// a side gutter), not one solid wall of text.
{
  const disclaimer =
    '1. Cashback offer available at participating dealers, while stocks last. Nissan reserves the right to vary this offer.\n' +
    '2. Optional No Repayments offer is available to approved applicants only. Interest will accrue and be capitalised.\n' +
    '3. The X-TRAIL loyalty finance offer is available to current Nissan owners. Terms and conditions apply.\n' +
    '\n' +
    'If you do not wish to receive future emails click here to unsubscribe.\n' +
    'NISSAN MOTOR CO. (AUSTRALIA) PTY. LTD.\n' +
    '1 Peters Avenue, Mulgrave, Victoria 3170';

  const doc: FigmaNodeDocument = {
    id: '8:1',
    name: 'Disclaimer',
    type: 'FRAME',
    visible: true,
    absoluteBoundingBox: { x: 0, y: 0, width: 600, height: 400 },
    layoutMode: 'VERTICAL',
    fills: [SOLID(1, 1, 1)],
    children: [
      text('8:2', 'Disclaimer', disclaimer, { fontSize: 10, fontWeight: 400, textAlignHorizontal: 'LEFT', paragraphSpacing: 8 }, { r: 0.4, g: 0.4, b: 0.4 }, 552, 360),
    ],
  };

  const tree = build(doc);
  const ts = texts(tree);
  check('H. disclaimer split into 6 paragraphs (3 items + 3 footer lines)', ts.length === 6, `texts=${ts.length}`);
  check('H. each item kept its number', String(ts[0]?.content ?? '').startsWith('1.') && String(ts[2]?.content ?? '').startsWith('3.'), `p0=${String(ts[0]?.content ?? '').slice(0, 4)}`);
  check('H. paragraphSpacing (8px) applied between items', Number(ts[0]?.style?.marginBottom ?? 0) === 8, `mb=${ts[0]?.style?.marginBottom}`);
  check('H. small disclaimer font preserved (10px)', String(ts[0]?.style?.fontSize) === '10px', `fs=${ts[0]?.style?.fontSize}`);
  const root = tree as { style?: Record<string, unknown> };
  check('H. side gutter added on text-only block', /\b(2[4-9]|[3-9]\d)px\b/.test(String(root.style?.padding ?? '')), `padding=${root.style?.padding}`);
}

// ── Scenario I: outline CTA whose border lives in individualStrokeWeights ─────
// The "REQUEST A QUOTE" secondary CTA: transparent fill, white stroke, but the
// weight is reported per-side (no uniform `strokeWeight`). The border must still
// survive. A second variant omits the weight entirely (Figma's implicit 1px).
{
  const WHITE = { r: 1, g: 1, b: 1 };
  const outlineBtn = (id: string, weightKind: 'individual' | 'implicit'): FigmaNodeDocument => ({
    id,
    name: 'CTA',
    type: 'INSTANCE',
    visible: true,
    absoluteBoundingBox: { x: 0, y: id === '9:3' ? 60 : 0, width: 290, height: 48 },
    cornerRadius: 24,
    layoutMode: 'HORIZONTAL',
    paddingLeft: 24,
    paddingRight: 24,
    fills: [], // transparent — fill comes from the section behind it
    strokes: [SOLID(WHITE.r, WHITE.g, WHITE.b)],
    ...(weightKind === 'individual'
      ? { individualStrokeWeights: { top: 1, right: 1, bottom: 1, left: 1 } }
      : {}),
    children: [
      text(`${id}-t`, 'Label', 'Request a quote', { fontSize: 14, fontWeight: 700, textAlignHorizontal: 'CENTER', textCase: 'UPPER' }, WHITE, 150, 24),
    ],
  });

  const doc: FigmaNodeDocument = {
    id: '9:1',
    name: 'CTA group',
    type: 'FRAME',
    visible: true,
    layoutMode: 'VERTICAL',
    itemSpacing: 12,
    absoluteBoundingBox: { x: 0, y: 0, width: 290, height: 108 },
    fills: [SOLID(0, 0, 0)],
    children: [outlineBtn('9:2', 'individual'), outlineBtn('9:3', 'implicit')],
  };

  const tree = build(doc);
  const bs = buttons(tree);
  check('I. both outline CTAs emitted', bs.length === 2, `count=${bs.length}`);
  check('I. per-side stroke weight produces a border', /1px solid/.test(String(bs[0]?.style?.border ?? '')), `border=${bs[0]?.style?.border}`);
  check('I. implicit (omitted) stroke weight still produces a border', /1px solid/.test(String(bs[1]?.style?.border ?? '')), `border=${bs[1]?.style?.border}`);
  check('I. border keeps the Figma stroke color (white)', String(bs[0]?.style?.border ?? '').includes('#ffffff'), `border=${bs[0]?.style?.border}`);
  check('I. outline CTA still uses the design width (290px)', bs[0]?.style?.width === '290px', `w=${bs[0]?.style?.width}`);
  check('I. textCase UPPER applied to outline label', bs[0]?.style?.textTransform === 'uppercase', `tt=${bs[0]?.style?.textTransform}`);
}

// ── Scenario J: transparent dark-hero → reconstruct the dark section bg ──────
// The Nissan MORE "1-up" component is fully transparent (its dark navy comes
// from an ancestor page frame we don't import). All surface copy is white and
// the CTA is an inverted white pill with a dark navy label (#131722). The
// section must be given that dark background back — otherwise white text lands
// on white and the whole block looks washed out.
{
  const WHITE = { r: 1, g: 1, b: 1 };
  const NAVY = { r: 19 / 255, g: 23 / 255, b: 34 / 255 }; // #131722
  const doc: FigmaNodeDocument = {
    id: '10:1',
    name: '1-up',
    type: 'INSTANCE',
    visible: true,
    layoutMode: 'VERTICAL',
    itemSpacing: 16,
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    paddingRight: 40,
    absoluteBoundingBox: { x: 0, y: 0, width: 600, height: 500 },
    backgroundColor: { r: 0, g: 0, b: 0, a: 0 }, // transparent
    children: [
      {
        id: '10:2',
        name: 'Frame',
        type: 'FRAME',
        visible: true,
        layoutMode: 'VERTICAL',
        itemSpacing: 12,
        absoluteBoundingBox: { x: 40, y: 40, width: 520, height: 200 },
        backgroundColor: { r: 0, g: 0, b: 0, a: 0 },
        children: [
          text('10:3', 'Heading', 'Now, with the new Nissan MORE Plan:', { fontSize: 28, fontWeight: 700, textAlignHorizontal: 'CENTER' }, WHITE, 520, 60),
          text('10:4', 'Body', 'When you service with Nissan during your 5-year warranty period, you’ll earn an additional year of coverage.', { fontSize: 16, fontWeight: 400, textAlignHorizontal: 'CENTER' }, WHITE, 520, 80),
        ],
      },
      {
        id: '10:5',
        name: 'CTA',
        type: 'INSTANCE',
        visible: true,
        layoutMode: 'HORIZONTAL',
        cornerRadius: 24,
        paddingLeft: 24,
        paddingRight: 24,
        absoluteBoundingBox: { x: 155, y: 400, width: 290, height: 48 },
        fills: [SOLID(WHITE.r, WHITE.g, WHITE.b)], // white pill
        children: [
          text('10:6', 'Label', 'See how it works', { fontSize: 14, fontWeight: 700, textAlignHorizontal: 'CENTER' }, NAVY, 180, 24),
        ],
      },
    ],
  };

  const tree = build(doc);
  const root = tree as { style?: Record<string, unknown> };
  const bg = String(root.style?.backgroundColor ?? '');
  check('J. transparent dark hero gets a dark section background (not washed out)', bg === '#131722', `bg=${bg || '-'}`);
  const ts = texts(tree);
  check('J. surface copy stays white', ts.every((t) => t.style?.color === '#ffffff'), `colors=${ts.map((t) => t.style?.color).join(',')}`);
  const bs = buttons(tree);
  check('J. inverted CTA keeps its white pill + navy label', bs[0]?.style?.backgroundColor === '#ffffff' && bs[0]?.style?.color === '#131722', `bg=${bs[0]?.style?.backgroundColor}, color=${bs[0]?.style?.color}`);
}

// ── Scenario K: footer disclaimer — character-level links/underlines + padding ─
// A disclaimer is one TEXT node whose BASE fill is a dark token but whose every
// character is overridden to white, with inline underlined hyperlinks living in
// characterStyleOverrides/styleOverrideTable. It sits in transparent wrapper
// frames that carry the 40px section padding. This exercises: (1) dominant-run
// colour beats the dark base fill, (2) dark background is reconstructed, (3)
// inline links/underlines survive as rich HTML, (4) transparent-frame padding
// is preserved.
{
  const WHITE = { r: 1, g: 1, b: 1 };
  const chars = 'See terms at Nissan.co.nz/warranty. Click here to unsubscribe.';
  const linkStart = chars.indexOf('Nissan.co.nz/warranty');
  const linkEnd = linkStart + 'Nissan.co.nz/warranty'.length;
  const hereStart = chars.indexOf('here');
  const hereEnd = hereStart + 'here'.length;
  const overrides = Array.from({ length: chars.length }, (_, i) => {
    if (i >= linkStart && i < linkEnd) return 2;
    if (i >= hereStart && i < hereEnd) return 3;
    return 1;
  });

  const disclaimer: FigmaNodeDocument = {
    id: '11:3',
    name: 'Disclaimer',
    type: 'TEXT',
    visible: true,
    characters: chars,
    // Dark base fill (a token) — must be overridden by the white character runs.
    style: { fontSize: 11, fontWeight: 400, paragraphSpacing: 8, lineHeightPx: 14 },
    fills: [SOLID(0.239, 0.239, 0.239)],
    characterStyleOverrides: overrides,
    styleOverrideTable: {
      '1': { fills: [SOLID(WHITE.r, WHITE.g, WHITE.b)] },
      '2': {
        fills: [SOLID(WHITE.r, WHITE.g, WHITE.b)],
        textDecoration: 'UNDERLINE',
        hyperlink: { type: 'URL', url: 'https://www.nissan.co.nz/warranty' },
      },
      '3': { fills: [SOLID(WHITE.r, WHITE.g, WHITE.b)], textDecoration: 'UNDERLINE' },
    },
    absoluteBoundingBox: { width: 520, height: 120 },
  };

  const doc: FigmaNodeDocument = {
    id: '11:0',
    name: 'Footer',
    type: 'INSTANCE',
    visible: true,
    layoutMode: 'VERTICAL',
    backgroundColor: { r: 0, g: 0, b: 0, a: 0 },
    absoluteBoundingBox: { x: 0, y: 0, width: 600, height: 300 },
    children: [
      {
        id: '11:1',
        name: 'Outer',
        type: 'FRAME',
        visible: true,
        layoutMode: 'VERTICAL',
        paddingLeft: 40,
        paddingRight: 40,
        backgroundColor: { r: 0, g: 0, b: 0, a: 0 },
        absoluteBoundingBox: { x: 0, y: 0, width: 600, height: 300 },
        children: [
          {
            id: '11:2',
            name: 'Inner',
            type: 'FRAME',
            visible: true,
            layoutMode: 'VERTICAL',
            paddingTop: 40,
            paddingBottom: 40,
            itemSpacing: 16,
            backgroundColor: { r: 0, g: 0, b: 0, a: 0 },
            absoluteBoundingBox: { x: 40, y: 0, width: 520, height: 300 },
            children: [
              disclaimer,
              text('11:4', 'Address', 'Nissan New Zealand Limited', { fontSize: 11 }, WHITE, 520, 20),
            ],
          },
        ],
      },
    ],
  };

  const tree = build(doc);
  const flat = JSON.stringify(tree);
  const rootBg = String((tree as { style?: Record<string, unknown> }).style?.backgroundColor ?? '');
  const rich = texts(tree).find((t) => typeof (t as { html?: string }).html === 'string') as
    | (Txt & { html?: string })
    | undefined;

  check('K. disclaimer text is white (dominant run beats dark base fill)', rich?.style?.color === '#ffffff', `color=${rich?.style?.color}`);
  check('K. dark section background reconstructed', /^#(0|1)/.test(rootBg), `bg=${rootBg || '-'}`);
  check('K. transparent wrapper padding preserved (40px)', flat.includes('40px'), 'no 40px padding found');
  check('K. inline hyperlink emitted as anchor', (rich?.html ?? '').includes('<a href="https://www.nissan.co.nz/warranty"'), `html=${(rich?.html ?? '').slice(0, 120)}`);
  check('K. link + label are underlined', (flat.match(/text-decoration:underline/g)?.length ?? 0) >= 2, 'underlines missing');
}

// ── Scenario L: mobile frame typography drives ≤600px font-size/line-height ───
// A desktop frame with a large heading + body, paired with a mobile frame whose
// matching layers use smaller type. The build must (1) keep desktop sizes in the
// inline style and (2) attach a mobileStyle carrying ONLY the mobile font size /
// line height for a media-query override.
{
  const deskFrame: FigmaNodeDocument = {
    id: '12:0',
    name: 'Hero',
    type: 'FRAME',
    visible: true,
    layoutMode: 'VERTICAL',
    itemSpacing: 16,
    absoluteBoundingBox: { width: 600, height: 400 },
    fills: [SOLID(1, 1, 1)],
    children: [
      text('12:1', 'Header', 'Ten Years of Warranty', { fontSize: 40, fontWeight: 700, lineHeightPx: 48 }, { r: 0, g: 0, b: 0 }, 520, 50),
      text('12:2', 'Body', 'Peace of mind for a decade.', { fontSize: 16, fontWeight: 400, lineHeightPx: 24 }, { r: 0.1, g: 0.1, b: 0.1 }, 520, 40),
    ],
  };
  const mobFrame: FigmaNodeDocument = {
    id: '12:10',
    name: 'Hero',
    type: 'FRAME',
    visible: true,
    layoutMode: 'VERTICAL',
    itemSpacing: 12,
    absoluteBoundingBox: { width: 375, height: 320 },
    fills: [SOLID(1, 1, 1)],
    children: [
      text('12:11', 'Header', 'Ten Years of Warranty', { fontSize: 26, fontWeight: 700, lineHeightPx: 30 }, { r: 0, g: 0, b: 0 }, 320, 34),
      text('12:12', 'Body', 'Peace of mind for a decade.', { fontSize: 14, fontWeight: 400, lineHeightPx: 20 }, { r: 0.1, g: 0.1, b: 0.1 }, 320, 34),
    ],
  };

  const tree = buildPrimitivesFromFigma(parseFigmaNode(deskFrame), parseFigmaNode(mobFrame), []);
  const head = headings(tree)[0] as (Head & { mobileStyle?: Record<string, unknown> }) | undefined;
  const body = texts(tree).find((t) => t.content.includes('Peace of mind')) as
    | (Txt & { mobileStyle?: Record<string, unknown> })
    | undefined;

  check('L. heading keeps desktop 40px inline', String(head?.style?.fontSize) === '40px', `fs=${head?.style?.fontSize}`);
  check('L. heading gets mobile 26px override', head?.mobileStyle?.fontSize === '26px', `mob=${JSON.stringify(head?.mobileStyle)}`);
  check('L. heading mobile line-height 30px', head?.mobileStyle?.lineHeight === '30px', `mob=${JSON.stringify(head?.mobileStyle)}`);
  check('L. body gets mobile 14px / 20px override', body?.mobileStyle?.fontSize === '14px' && body?.mobileStyle?.lineHeight === '20px', `mob=${JSON.stringify(body?.mobileStyle)}`);
}

// ── Scenario M: desktop-only import → proportional mobile auto-scaling ─────────
// Most campaign components are imported WITHOUT a mobile frame, so mobile would
// otherwise show desktop type. Oversized headings must shrink on mobile while
// small legal/body copy is left alone, and desktop inline sizes stay intact.
{
  const deskFrame: FigmaNodeDocument = {
    id: '13:0',
    name: 'CallOut',
    type: 'FRAME',
    visible: true,
    layoutMode: 'VERTICAL',
    itemSpacing: 16,
    absoluteBoundingBox: { width: 600, height: 400 },
    fills: [SOLID(1, 1, 1)],
    children: [
      text('13:1', 'Header', 'The Nissan New Car Warranty', { fontSize: 28, fontWeight: 400, lineHeightPx: 36 }, { r: 0, g: 0, b: 0 }, 520, 40),
      text('13:2', 'Legal', 'Terms and conditions apply to this offer.', { fontSize: 12, fontWeight: 400, lineHeightPx: 16 }, { r: 0.2, g: 0.2, b: 0.2 }, 520, 20),
    ],
  };

  const tree = buildPrimitivesFromFigma(parseFigmaNode(deskFrame), undefined, []);
  const head = headings(tree)[0];
  const legal = texts(tree).find((t) => t.content.includes('Terms and conditions'));
  // Auto-scaling is applied at RENDER time (so it also fixes already-built,
  // desktop-only campaigns), so we assert via the renderer's nodeMobileStyle.
  const headMob = head ? nodeMobileStyle(head) : undefined;
  const legalMob = legal ? nodeMobileStyle(legal) : undefined;

  check('M. desktop heading keeps 28px inline', String(head?.style?.fontSize) === '28px', `fs=${head?.style?.fontSize}`);
  check('M. desktop-only heading auto-scales down on mobile (<28px)', (() => {
    const mfs = parseInt(String(headMob?.fontSize ?? '99'), 10);
    return mfs > 0 && mfs < 28;
  })(), `mob=${JSON.stringify(headMob)}`);
  check('M. mobile heading line-height scales proportionally', headMob?.lineHeight != null, `mob=${JSON.stringify(headMob)}`);
  check('M. small legal copy (12px) is NOT scaled on mobile', !legalMob, `mob=${JSON.stringify(legalMob)}`);
}

// ── Scenario N: full-bleed hero art breaks out of the frame's side padding ────
// A padded hero frame (32px pt + 32px px) stacks a small logo, a heading, and a
// full-width photo (width == frame width). The photo is a deliberate full-bleed
// element and must render edge-to-edge — NOT confined to the padded content box
// (which shrank it and invented side gutters). The logo/heading stay inset.
{
  const heroFrame: FigmaNodeDocument = {
    id: '14:0',
    name: 'Hero',
    type: 'FRAME',
    visible: true,
    layoutMode: 'VERTICAL',
    itemSpacing: 16,
    paddingTop: 32,
    paddingRight: 32,
    paddingBottom: 0,
    paddingLeft: 32,
    absoluteBoundingBox: { width: 600, height: 800 },
    fills: [SOLID(1, 0.98, 0.9)],
    children: [
      {
        id: '14:1',
        name: 'Logo',
        type: 'RECTANGLE',
        visible: true,
        fills: [{ type: 'IMAGE', imageRef: 'logo-ref' }],
        absoluteBoundingBox: { width: 92, height: 40 },
      },
      text('14:2', 'Header', 'Pair Spring with a Spritz', { fontSize: 96, fontWeight: 700, lineHeightPx: 96 }, { r: 1, g: 0.33, b: 0 }, 536, 200),
      {
        id: '14:3',
        name: 'shave 1',
        type: 'RECTANGLE',
        visible: true,
        fills: [{ type: 'IMAGE', imageRef: 'shave-ref' }],
        absoluteBoundingBox: { width: 600, height: 572 },
      },
    ],
  };

  const tree = buildPrimitivesFromFigma(parseFigmaNode(heroFrame), undefined, []);
  type Img = Extract<ReactEmailNode, { type: 'Img' }>;
  type Sec = Extract<ReactEmailNode, { type: 'Section' }>;
  const imgs = collect(tree).filter((n): n is Img => n.type === 'Img');
  const heroImg = imgs.find((i) => i.alt === 'shave 1');
  const logoImg = imgs.find((i) => i.alt === 'Logo');
  const outer = tree as Sec;
  const outerPad = String(outer.style?.padding ?? '');
  // The inner wrapper holds the inset content (logo + heading) with side padding.
  const insetWrapper = (outer.children ?? []).find(
    (n): n is Sec => n.type === 'Section' && n.style?.paddingLeft != null
  );

  check('N. full-bleed hero art flagged fullBleed', heroImg?.fullBleed === true, `fullBleed=${heroImg?.fullBleed}`);
  check('N. logo (inset) is NOT full-bleed', !logoImg?.fullBleed, `fullBleed=${logoImg?.fullBleed}`);
  check('N. outer section drops horizontal padding', /^32px 0px/.test(outerPad), `pad=${outerPad || '-'}`);
  check('N. inset content keeps the 32px side padding', insetWrapper?.style?.paddingLeft === 32 && insetWrapper?.style?.paddingRight === 32, `padL=${insetWrapper?.style?.paddingLeft}`);
  check('N. hero art is a direct child of the outer section (not inside the inset wrapper)', (outer.children ?? []).some((n) => n.type === 'Img' && (n as Img).alt === 'shave 1'), 'hero image not at section root');
}

// ── Scenario O: separate mobile TEXT content swaps desktop↔mobile at ≤600px ───
// A Text/Heading carrying a distinct `mobileContent`/`mobileHtml` must emit BOTH
// a `-desk` and a `-mob` variant class plus the show/hide media query (the same
// mechanism as responsive image swaps). A node with no mobile override stays a
// single element (no swap CSS) — so existing campaigns don't regress.
{
  const withMobile: ReactEmailNode = {
    type: 'Section',
    children: [
      { type: 'Heading', as: 'h1', content: 'Big Summer Sale', mobileContent: 'Summer Sale' },
      { type: 'Text', content: 'Long desktop copy that overflows a phone.', mobileContent: 'Short mobile copy.' },
    ],
  };
  const css = buildFigmaResponsiveCss(withMobile, 'scenarioO');
  check('O. mobile text override emits a -desk swap class', /figma-txt-scenarioO-[0-9-]+-desk/.test(css), '');
  check('O. mobile text override emits a -mob swap class', /figma-txt-scenarioO-[0-9-]+-mob/.test(css), '');
  check(
    'O. swap hides -desk and shows -mob at ≤600px',
    /@media only screen and \(max-width: ?600px\)/.test(css) &&
      /figma-txt-scenarioO-[0-9-]+-desk\s*\{\s*display: none/.test(css) &&
      /figma-txt-scenarioO-[0-9-]+-mob\s*\{\s*display: block/.test(css),
    ''
  );

  const noMobile: ReactEmailNode = {
    type: 'Section',
    children: [{ type: 'Text', content: 'Shared everywhere.' }],
  };
  const cssNone = buildFigmaResponsiveCss(noMobile, 'scenarioO2');
  check('O. node without a mobile override emits no text-swap CSS (no regression)', !/figma-txt-/.test(cssNone), `css=${cssNone.trim().slice(0, 40)}`);
}

// ── Scenario P: mixed-mode forced icon → Img, sibling text stays Text ───────
{
  const iconGroup: ParsedFigmaNode = {
    id: '1:2',
    nodeId: '1:2',
    type: 'GROUP',
    name: 'Award icon',
    width: 48,
    height: 48,
    visible: true,
    forcedExportUrl: '/images/uploads/test-icon.png',
    children: [
      { id: '1:3', nodeId: '1:3', type: 'VECTOR', name: 'Star', width: 48, height: 48, visible: true, children: [] },
    ],
  };
  const copy: ParsedFigmaNode = {
    id: '1:4',
    nodeId: '1:4',
    type: 'TEXT',
    name: 'Headline',
    width: 400,
    height: 32,
    visible: true,
    text: 'Drive away today',
    fontSize: 28,
    children: [],
  };
  const root: ParsedFigmaNode = {
    id: '1:1',
    nodeId: '1:1',
    type: 'FRAME',
    name: 'Intro',
    width: 600,
    height: 200,
    visible: true,
    layoutMode: 'VERTICAL',
    children: [iconGroup, copy],
  };
  const tree = buildPrimitivesFromFigma(root, undefined, [], new Set(['1:2']));
  const all = collect(tree);
  const imgs = all.filter((n): n is Extract<ReactEmailNode, { type: 'Img' }> => n.type === 'Img');
  const texts = all.filter(
    (n): n is Extract<ReactEmailNode, { type: 'Text' } | { type: 'Heading' }> =>
      n.type === 'Text' || n.type === 'Heading'
  );
  check('P. forced icon subtree becomes an Img', imgs.length === 1 && imgs[0].src === '/images/uploads/test-icon.png', `imgs=${imgs.length}`);
  check('P. sibling copy stays structured Text/Heading', texts.some((t) => 'content' in t && t.content?.includes('Drive away')), `texts=${texts.length}`);
}

// ── Scenario Q: 56×56 badge frame — one export root, not inner 22×22 vectors ─
{
  const badge: ParsedFigmaNode = {
    id: '2:1',
    nodeId: '2:1',
    type: 'FRAME',
    name: 'Icon badge',
    width: 56,
    height: 56,
    visible: true,
    children: [
      {
        id: '2:2',
        nodeId: '2:2',
        type: 'VECTOR',
        name: 'Vector',
        width: 22,
        height: 22,
        visible: true,
        children: [],
      },
      {
        id: '2:3',
        nodeId: '2:3',
        type: 'VECTOR',
        name: 'Vector',
        width: 10,
        height: 8,
        visible: true,
        children: [],
      },
    ],
  };
  const root: ParsedFigmaNode = {
    id: '2:0',
    nodeId: '2:0',
    type: 'FRAME',
    name: 'Benefit column',
    width: 200,
    height: 120,
    visible: true,
    layoutMode: 'VERTICAL',
    children: [
      badge,
      {
        id: '2:9',
        nodeId: '2:9',
        type: 'TEXT',
        name: 'Copy',
        width: 180,
        height: 40,
        visible: true,
        text: 'Up to 10 years warranty',
        children: [],
      },
    ],
  };
  const ids = detectImageNodeIds(root);
  check('Q. detects the 56×56 badge frame once', ids.length === 1 && ids[0] === '2:1', `ids=${ids.join(',')}`);
}

// ── Scenario R: design-context line matches INSTANCE Icon-badge ─────────────
{
  const badge: ParsedFigmaNode = {
    id: '3:1',
    nodeId: '3:1',
    type: 'INSTANCE',
    name: 'Icon-badge',
    width: 56,
    height: 56,
    visible: true,
    children: [
      {
        id: '3:2',
        nodeId: '3:2',
        type: 'VECTOR',
        name: 'Vector',
        width: 12,
        height: 12,
        visible: true,
        children: [],
      },
    ],
  };
  const root: ParsedFigmaNode = {
    id: '3:0',
    nodeId: '3:0',
    type: 'FRAME',
    name: 'Benefits',
    width: 600,
    height: 200,
    visible: true,
    children: [badge],
  };
  const ctx =
    'Structure:\n  - INSTANCE "Icon-badge" 56×56px bg=#22252f layout=HORIZONTAL gap=11.25';
  const hintIds = findNodeIdsFromDesignHints(root, ctx);
  check('R. design context line resolves Icon-badge instance', hintIds[0] === '3:1', `ids=${hintIds.join(',')}`);
}

console.log(pass ? '\nALL FIDELITY CHECKS PASSED' : '\nSOME FIDELITY CHECKS FAILED');
process.exit(pass ? 0 : 1);
