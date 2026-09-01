// Server-only secret verification (Story 2.6 / AR11, NFR2).
//
// Scans client components for secret env var references. After a production
// build, also scans .next/static chunks for leaked secret names.

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const SECRET_ENV_NAMES = [
  'FIGMA_ACCESS_TOKEN',
  'GEMINI_API_KEY',
  'RESEND_API_KEY',
  'DATABASE_URL',
];

const FORBIDDEN_PATTERNS = [
  /process\.env\.(FIGMA_ACCESS_TOKEN|GEMINI_API_KEY|RESEND_API_KEY|DATABASE_URL)/,
  /from\s+['"]@\/lib\/config['"]/,
];

/** @type {{file:string, rule:string, detail:string}[]} */
const violations = [];

function toPosix(p) {
  return p.split(sep).join('/');
}

function walk(dir, onFile) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      walk(full, onFile);
    } else {
      onFile(full);
    }
  }
}

function scanClientSource(full) {
  if (!/\.(tsx|ts|jsx|js)$/.test(full)) return;
  const source = readFileSync(full, 'utf8');
  if (!source.includes("'use client'") && !source.includes('"use client"')) return;

  const rel = toPosix(relative(SRC, full));
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(source)) {
      violations.push({
        file: rel,
        rule: 'client-secret-leak',
        detail: `matches forbidden pattern ${pattern}`,
      });
    }
  }
}

function scanBundleChunk(full) {
  if (!full.endsWith('.js')) return;
  const source = readFileSync(full, 'utf8');
  const rel = toPosix(relative(ROOT, full));
  for (const name of SECRET_ENV_NAMES) {
    if (source.includes(name)) {
      violations.push({
        file: rel,
        rule: 'secret-in-bundle',
        detail: `built chunk contains secret env name "${name}"`,
      });
    }
  }
}

walk(SRC, scanClientSource);

const staticDir = join(ROOT, '.next', 'static');
if (existsSync(staticDir)) {
  walk(staticDir, scanBundleChunk);
}

if (violations.length > 0) {
  console.error(`\nSecret check FAILED — ${violations.length} violation(s):\n`);
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}\n      ${v.detail}`);
  }
  console.error('');
  process.exit(1);
}

console.log('Secret check passed: no server-only credentials found in client-reachable code.');
