import { readFileSync } from 'fs';
import path from 'path';
import { buildPrimitivesFromFigma } from '../src/lib/figma/figmaPrimitives';
import { collectExportNodeIds, type ParsedFigmaNode } from '../src/lib/figma/parseFigmaNode';
import type { ReactEmailNode } from '../src/lib/figma/types/reactEmailAst';

const btnPrimary: ParsedFigmaNode = {
  id: '133:297',
  type: 'INSTANCE',
  name: 'Button / Primary',
  width: 520,
  height: 52,
  visible: true,
  children: [
    {
      id: 'bg1',
      type: 'RECTANGLE',
      name: 'Fill',
      width: 520,
      height: 52,
      visible: true,
      backgroundColor: '#c3002f',
      cornerRadius: 26,
      children: [],
    },
    {
      id: 't1',
      type: 'TEXT',
      name: 'Label',
      width: 180,
      height: 18,
      visible: true,
      text: 'SEE ALL OFFERS →',
      fontSize: 14,
      fontWeight: 700,
      color: '#ffffff',
      children: [],
    },
  ],
};

const btnSecondary: ParsedFigmaNode = {
  id: '133:298',
  type: 'INSTANCE',
  name: 'Button / Secondary',
  width: 520,
  height: 52,
  visible: true,
  children: [
    {
      id: 'bg2',
      type: 'RECTANGLE',
      name: 'Fill',
      width: 520,
      height: 52,
      visible: true,
      backgroundColor: '#ffffff',
      cornerRadius: 26,
      children: [],
    },
    {
      id: 't2',
      type: 'TEXT',
      name: 'Label',
      width: 180,
      height: 18,
      visible: true,
      text: 'REQUEST A QUOTE',
      fontSize: 14,
      fontWeight: 700,
      color: '#000000',
      children: [],
    },
  ],
};

/** Matches real Nissan Figma: Opening → content frame + CTA frame (siblings) */
const openingRealStructure: ParsedFigmaNode = {
  id: '133:292',
  type: 'FRAME',
  name: 'Opening',
  width: 600,
  height: 520,
  visible: true,
  backgroundColor: '#000000',
  paddingTop: 40,
  paddingRight: 40,
  paddingBottom: 40,
  paddingLeft: 40,
  layoutMode: 'VERTICAL',
  counterAxisAlign: 'CENTER',
  gap: 24,
  children: [
    {
      id: '133:293',
      type: 'FRAME',
      name: 'Frame 48098941',
      width: 520,
      height: 344,
      visible: true,
      layoutMode: 'VERTICAL',
      counterAxisAlign: 'CENTER',
      gap: 16,
      exportUrl: '/images/uploads/figma-export-fd8edbd4.png',
      children: [
        {
          id: 'h1',
          type: 'TEXT',
          name: 'Header',
          width: 520,
          height: 80,
          visible: true,
          text: 'Exclusive offers for\nNissan owners',
          fontSize: 36,
          fontWeight: 700,
          color: '#ffffff',
          textAlign: 'center',
          children: [],
        },
        {
          id: 'body',
          type: 'TEXT',
          name: 'Body',
          width: 520,
          height: 200,
          visible: true,
          text: '<Name>, your April offers are waiting.\n\nNow\'s the time to go electric with ARIYA — secure 1% finance¹ across the range, and driveaway from $53,990³ on the 63kWh Engage variant.\n\nUnmissable offers below include the all-new Navara, MY26 X-TRAIL and MY26 QASHQAI.\n\nClick below to see all offers.',
          fontSize: 16,
          fontWeight: 400,
          color: '#ffffff',
          textAlign: 'center',
          children: [],
        },
      ],
    },
    {
      id: '133:296',
      type: 'FRAME',
      name: 'CTA',
      width: 520,
      height: 120,
      visible: true,
      layoutMode: 'VERTICAL',
      counterAxisAlign: 'CENTER',
      gap: 16,
      exportUrl: '/images/uploads/figma-export-db16312e.png',
      children: [btnPrimary, btnSecondary],
    },
  ],
};

/** CTA buttons with vectorized text (no TEXT nodes) */
const openingVectorButtons: ParsedFigmaNode = {
  ...openingRealStructure,
  children: [
    openingRealStructure.children[0],
    {
      ...openingRealStructure.children[1],
      children: [
        {
          ...btnPrimary,
          children: [
            {
              id: 'bg1',
              type: 'RECTANGLE',
              name: 'Fill',
              width: 520,
              height: 52,
              visible: true,
              backgroundColor: '#c3002f',
              cornerRadius: 26,
              children: [],
            },
          ],
        },
        {
          ...btnSecondary,
          children: [
            {
              id: 'bg2',
              type: 'RECTANGLE',
              name: 'Fill',
              width: 520,
              height: 52,
              visible: true,
              backgroundColor: '#ffffff',
              cornerRadius: 26,
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

function countTypes(tree: ReactEmailNode) {
  const types: string[] = [];
  function walk(n: ReactEmailNode) {
    types.push(n.type);
    if ('children' in n && Array.isArray(n.children)) n.children.forEach(walk);
  }
  walk(tree);
  return {
    buttons: types.filter((t) => t === 'Button').length,
    headings: types.filter((t) => t === 'Heading').length,
    texts: types.filter((t) => t === 'Text').length,
    imgs: types.filter((t) => t === 'Img').length,
  };
}

function run(label: string, node: ParsedFigmaNode) {
  const warnings: string[] = [];
  const tree = buildPrimitivesFromFigma(node, undefined, warnings);
  const { buttons, headings, texts, imgs } = countTypes(tree);
  const ok = buttons === 2 && headings === 1 && texts >= 1 && imgs === 0;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${label}: ${headings} Heading, ${texts} Text, ${buttons} Button, ${imgs} Img`
  );
  if (!ok) console.log('  warnings:', warnings);
  return ok;
}

const a = run('Real Figma structure (content + CTA sibling)', openingRealStructure);
const b = run('Vectorized button labels', openingVectorButtons);

// ── Absolutely-positioned overlay key-visual (rasterize, don't stack layers) ──

const KNOWN_REACT_EMAIL = new Set([
  'Section', 'Container', 'Row', 'Column', 'Text', 'Heading', 'Img', 'Link', 'Button', 'Hr', 'Spacer',
]);

function collectAst(tree: ReactEmailNode): ReactEmailNode[] {
  const all: ReactEmailNode[] = [];
  (function walk(n: ReactEmailNode) {
    all.push(n);
    if ('children' in n && Array.isArray(n.children)) n.children.forEach(walk);
  })(tree);
  return all;
}
function maxFontSize(nodes: ReactEmailNode[]): number {
  let max = 0;
  for (const n of nodes) {
    if ((n.type === 'Text' || n.type === 'Heading') && n.style?.fontSize != null) {
      const fs = parseFloat(String(n.style.fontSize));
      if (Number.isFinite(fs)) max = Math.max(max, fs);
    }
  }
  return max;
}
function findByName(node: ParsedFigmaNode, name: string): ParsedFigmaNode | undefined {
  if (node.name === name) return node;
  for (const c of node.children ?? []) {
    const hit = findByName(c, name);
    if (hit) return hit;
  }
  return undefined;
}

const kvComposite: ParsedFigmaNode = {
  id: 'kv', nodeId: '1:100', type: 'INSTANCE', name: 'KV 600px',
  width: 600, height: 900, visible: true, backgroundColor: '#ffffff',
  children: [
    { id: 'bg', nodeId: '1:101', type: 'RECTANGLE', name: 'BG', width: 600, height: 1067, visible: true, imageRef: 'hash-bg', children: [] },
    { id: 'car', nodeId: '1:102', type: 'RECTANGLE', name: 'Car', width: 528, height: 854, visible: true, imageRef: 'hash-car', children: [] },
    { id: 'price', nodeId: '1:103', type: 'GROUP', name: 'Price', width: 540, height: 151, visible: true,
      children: [
        { id: 'p1', nodeId: '1:104', type: 'TEXT', name: '$', width: 55, height: 55, visible: true, text: '$', fontSize: 84, fontWeight: 700, color: '#ffffff', children: [] },
        { id: 'p2', nodeId: '1:105', type: 'TEXT', name: 'Amount', width: 494, height: 107, visible: true, text: '38,888', fontSize: 164, fontWeight: 700, color: '#ffffff', children: [] },
      ] },
  ],
};

function checkComposites(): boolean {
  let ok = true;

  // (1) With exportUrl → single Img using the exported PNG, no giant overlay text.
  {
    const withExport: ParsedFigmaNode = { ...kvComposite, exportUrl: '/images/uploads/kv.png' };
    const tree = buildPrimitivesFromFigma(withExport, undefined, []);
    const nodes = collectAst(tree);
    const imgs = nodes.filter((n): n is Extract<ReactEmailNode, { type: 'Img' }> => n.type === 'Img');
    const usesExport = imgs.some((i) => i.src === '/images/uploads/kv.png');
    const noGiant = maxFontSize(nodes) < 60;
    const pass = imgs.length === 1 && usesExport && noGiant;
    console.log(`${pass ? 'PASS' : 'FAIL'} Absolute composite WITH exportUrl → single KV image (imgs=${imgs.length}, usesExport=${usesExport}, maxFont=${maxFontSize(nodes)})`);
    ok = ok && pass;
  }

  // (2) Without exportUrl → falls back to dominant background image; overlay text dropped.
  {
    const tree = buildPrimitivesFromFigma(kvComposite, undefined, []);
    const nodes = collectAst(tree);
    const imgs = nodes.filter((n) => n.type === 'Img');
    const noGiant = maxFontSize(nodes) < 60;
    const pass = imgs.length === 1 && noGiant;
    console.log(`${pass ? 'PASS' : 'FAIL'} Absolute composite WITHOUT exportUrl → dominant bg image, overlay dropped (imgs=${imgs.length}, maxFont=${maxFontSize(nodes)})`);
    ok = ok && pass;
  }

  // (3) collectExportNodeIds marks the composite frame for PNG export. The
  // composite must sit below the root (depth >= 1) — we never rasterize the whole
  // top-level frame — so wrap it in a parent as in a real import.
  {
    const wrapped: ParsedFigmaNode = {
      id: 'root', nodeId: '1:1', type: 'FRAME', name: 'Hero', width: 600, height: 1500,
      visible: true, layoutMode: 'VERTICAL', children: [kvComposite],
    };
    const ids = collectExportNodeIds(wrapped);
    const pass = ids.includes('1:100');
    console.log(`${pass ? 'PASS' : 'FAIL'} collectExportNodeIds exports the overlay composite frame (got ${ids.length} ids, includes KV=${pass})`);
    ok = ok && pass;
  }

  return ok;
}

// ── Persisted REAL fixture regression (node 400:1500 of NSSNAM-2779) ──────────

function checkRealFixture(): boolean {
  const fp = path.join(process.cwd(), 'scripts', 'fixtures', 'nissan-april-400-1500.json');
  let root: ParsedFigmaNode;
  try {
    root = JSON.parse(readFileSync(fp, 'utf8')) as ParsedFigmaNode;
  } catch {
    console.log('SKIP Real fixture (scripts/fixtures/nissan-april-400-1500.json not found)');
    return true; // don't fail CI if the fixture isn't present
  }

  const tree = buildPrimitivesFromFigma(root, undefined, []);
  const nodes = collectAst(tree);
  const { buttons, headings } = countTypes(tree);
  const imgs = nodes.filter((n) => n.type === 'Img').length;
  const unknown = [...new Set(nodes.map((n) => n.type))].filter((t) => !KNOWN_REACT_EMAIL.has(t));
  const giant = maxFontSize(nodes);

  const fails: string[] = [];
  if (headings < 1) fails.push(`expected >=1 Heading, got ${headings}`);
  if (buttons !== 2) fails.push(`expected 2 Buttons (filled + outline), got ${buttons}`);
  if (imgs < 1 || imgs > 2) fails.push(`expected KV collapsed to 1 image (1-2), got ${imgs}`);
  if (giant >= 60) fails.push(`overlay text leaked as giant heading (maxFont=${giant})`);
  if (unknown.length) fails.push(`non-react.email node types: ${unknown.join(', ')}`);

  // The outline composite (KV 600px) must be marked for export in a real import.
  const kv = findByName(root, 'KV 600px');
  if (kv?.nodeId) {
    const ids = collectExportNodeIds(root);
    if (!ids.includes(kv.nodeId)) fails.push('KV 600px not marked for PNG export');
  }

  const pass = fails.length === 0;
  console.log(`${pass ? 'PASS' : 'FAIL'} Real fixture 400:1500 (KV rasterized, Opening intact): ${headings} Heading, ${buttons} Button, ${imgs} Img, maxFont=${giant}`);
  if (!pass) fails.forEach((f) => console.log('   - ' + f));
  return pass;
}

const c = checkComposites();
const d = checkRealFixture();

process.exit(a && b && c && d ? 0 : 1);
