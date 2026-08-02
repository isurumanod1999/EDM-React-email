// Boundary-discipline verification (Story 1.9 / AD-1).
//
// Fails (exit 1) when a layer reaches across an architectural boundary:
//   1. API route handlers (src/app/**) must not import Node's fs/path directly
//      — storage goes through services/ports/adapters, never raw filesystem.
//   2. The ports layer (src/lib/ports/**) must stay a pure contract: no adapter
//      implementations and no app/UI imports.
//
// This keeps the composition root (src/lib/container.ts) the single place that
// binds implementations, so swapping a driver later stays a one-file change.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');

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

function checkFile(full) {
  const rel = toPosix(relative(SRC, full));
  const source = readFileSync(full, 'utf8');
  const specs = importsOf(source);

  const isRoute = rel.startsWith('app/');
  const isPort = rel.startsWith('lib/ports/');

  for (const spec of specs) {
    if (isRoute && /^(node:)?(fs|path)(\/|$)/.test(spec)) {
      violations.push({
        file: rel,
        rule: 'route-no-fs',
        detail: `route handler imports "${spec}" — go through a service/port instead`,
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
