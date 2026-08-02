// Boundary-discipline verification (Stories 1.9, 2.2 / AD-1, AD-2).
//
// Fails (exit 1) when a layer reaches across an architectural boundary:
//   1. API route handlers (src/app/**) must not import Node's fs/path directly.
//   2. The ports layer must stay a pure contract.
//   3. src/lib/** (except adapters) must not import fs — known legacy exceptions
//      are allowlisted until refactored behind ports.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/** Pre-existing fs usage outside adapters — recorded exceptions (Story 1.9). */
const LIB_FS_ALLOWLIST = new Set([
  'lib/adapters/filesystem/templateRepository.ts',
  'lib/adapters/local-assets/assetStore.ts',
  'lib/figma/importFromFigma.ts',
  'lib/figma/attachMissingForcedExports.ts',
  'lib/ai/analyzeComponent.ts',
  'lib/export/index.ts',
  'lib/export/bundleImages.ts',
]);

/** @type {{file:string, rule:string, detail:string}[]} */
const violations = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      walk(full);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      checkFile(full);
    }
  }
}

const IMPORT_RE = /(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]/g;
const REQUIRE_RE = /require\(\s*['"]([^'"]+)['"]\s*\)/g;

function importsOf(source) {
  const specs = [];
  let m;
  while ((m = IMPORT_RE.exec(source))) specs.push(m[1]);
  while ((m = REQUIRE_RE.exec(source))) specs.push(m[1]);
  return specs;
}

function toPosix(p) {
  return p.split(sep).join('/');
}

function isFsImport(spec) {
  return /^(node:)?(fs|path)(\/|$)/.test(spec);
}

function checkFile(full) {
  const rel = toPosix(relative(SRC, full));
  const source = readFileSync(full, 'utf8');
  const specs = importsOf(source);

  const isRoute = rel.startsWith('app/');
  const isPort = rel.startsWith('lib/ports/');
  const isLibOutsideAdapters =
    rel.startsWith('lib/') && !rel.startsWith('lib/adapters/') && !LIB_FS_ALLOWLIST.has(rel);

  for (const spec of specs) {
    if (isRoute && isFsImport(spec)) {
      violations.push({
        file: rel,
        rule: 'route-no-fs',
        detail: `route handler imports "${spec}" — go through a service/port instead`,
      });
    }

    if (isLibOutsideAdapters && isFsImport(spec)) {
      violations.push({
        file: rel,
        rule: 'lib-no-fs',
        detail: `lib module imports "${spec}" outside adapters — use a port or add a documented allowlist entry`,
      });
    }

    if (isPort && (spec.startsWith('@/lib/adapters/') || spec.includes('/adapters/'))) {
      violations.push({
        file: rel,
        rule: 'port-no-adapter',
        detail: `ports layer imports an adapter "${spec}" — ports must stay implementation-free`,
      });
    }

    if (isPort && (spec.startsWith('@/app/') || spec.startsWith('@/builder/'))) {
      violations.push({
        file: rel,
        rule: 'port-no-app',
        detail: `ports layer imports app/UI "${spec}" — ports must not depend on delivery layers`,
      });
    }
  }
}

walk(SRC);

if (violations.length > 0) {
  console.error(`\nBoundary check FAILED — ${violations.length} violation(s):\n`);
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}\n      ${v.detail}`);
  }
  console.error('');
  process.exit(1);
}

console.log('Boundary check passed: no architectural boundary violations found.');
