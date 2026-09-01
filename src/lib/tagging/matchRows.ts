import {
  normalizeMatchKey,
  type LinkableTarget,
  type MatchTaggingResult,
  type TaggingRow,
} from '@/lib/tagging/types';

function isCtaishLabel(urlLabel: string): boolean {
  const k = normalizeMatchKey(urlLabel);
  return /^cta\d*/.test(k) || /^button\d*/.test(k);
}

function isCtaishTarget(t: LinkableTarget): boolean {
  if (['ctaUrl', 'buttonUrl', 'primaryUrl', 'secondaryUrl'].includes(t.propKey)) return true;
  return t.nodeType === 'Button' || t.nodeType === 'Link';
}

/** Candidates whose matchKeys equal or uniquely contain the normalized URL Label. */
export function findMatchingTargets(
  urlLabel: string,
  targets: LinkableTarget[]
): LinkableTarget[] {
  const key = normalizeMatchKey(urlLabel);
  if (!key) return [];

  const exact = targets.filter((t) => t.matchKeys.includes(key));
  if (exact.length > 0) return exact;

  const fuzzy = targets.filter((t) =>
    t.matchKeys.some((h) => h.length >= 4 && (key.includes(h) || h.includes(key)))
  );
  return fuzzy;
}

/** Section words let `header-*` rows avoid landing on footer targets. */
const SECTION_WORDS = ['header', 'footer', 'hero', 'opening', 'preheader', 'banner', 'nav'];

/** Node/structure words carry no naming signal, so they must not count as overlap. */
const STRUCTURAL_WORDS = new Set([
  'img',
  'button',
  'link',
  'text',
  'heading',
  'figma',
  'section',
  'block',
  'div',
  'row',
  'column',
  'container',
]);

const IMAGE_WORDS = ['logo', 'image', 'img', 'hero', 'banner', 'icon'];

/** Split on separators and camelCase so `cta1-RegisterYourInterest` yields real words. */
function tokenize(value: string | undefined): string[] {
  return String(value ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 3);
}

/**
 * Rank how well a row's URL Label describes a target. Additive signals keep a
 * near-miss scoring above zero so an imperfect label still proposes rather than
 * silently dropping to unmatched.
 */
export function scoreRowTarget(row: TaggingRow, target: LinkableTarget): number {
  const key = normalizeMatchKey(row.urlLabel);
  if (!key) return 0;

  let score = 0;

  if (target.matchKeys.includes(key)) {
    score += 60;
  } else if (
    target.matchKeys.some((h) => h.length >= 4 && (key.includes(h) || h.includes(key)))
  ) {
    score += 8;
  }

  const rowTokens = tokenize(row.urlLabel);
  const targetTokens = new Set(
    tokenize(target.displayName).filter((t) => !STRUCTURAL_WORDS.has(t))
  );
  for (const token of new Set(rowTokens)) {
    if (targetTokens.has(token)) score += 22;
  }

  const rowSection = rowTokens.find((t) => SECTION_WORDS.includes(t));
  const targetSection = [...targetTokens].find((t) => SECTION_WORDS.includes(t));
  if (rowSection && targetSection) score += rowSection === targetSection ? 30 : -40;

  if (isCtaishLabel(row.urlLabel)) score += isCtaishTarget(target) ? 25 : -20;

  if (rowTokens.some((t) => IMAGE_WORDS.includes(t))) {
    const imageTarget =
      target.nodeType === 'Img' || target.propKey === 'logoUrl' || target.propKey === 'url';
    score += imageTarget ? 20 : -12;
  }

  return score;
}

/** Below this a pairing is noise rather than a weak-but-plausible match. */
const MIN_SCORE = 25;

/**
 * Propose row→target mappings by URL Label. Does not mutate template props (AD-14).
 * Skipped rows stay skipped; ambiguous/zero matches → unmatched.
 */
export function matchTaggingRows(
  rows: TaggingRow[],
  targets: LinkableTarget[]
): MatchTaggingResult {
  const claimed = new Set<string>();
  const nextRows: TaggingRow[] = rows.map((row) =>
    row.status === 'skipped'
      ? { ...row, targetId: undefined, status: 'skipped' as const }
      : { ...row, status: 'unmatched' as const, targetId: undefined, skipReason: undefined }
  );

  // Score every row/target pairing, then assign best-first. Resolving globally
  // stops an early row from claiming a target that a later row describes better.
  const pairs: Array<{ rowIdx: number; targetId: string; score: number; order: number }> = [];
  nextRows.forEach((row, rowIdx) => {
    if (row.status === 'skipped') return;
    targets.forEach((target, targetIdx) => {
      const score = scoreRowTarget(row, target);
      if (score >= MIN_SCORE) {
        pairs.push({ rowIdx, targetId: target.id, score, order: rowIdx * 1000 + targetIdx });
      }
    });
  });
  pairs.sort((a, b) => b.score - a.score || a.order - b.order);

  const takenRows = new Set<number>();
  for (const pair of pairs) {
    if (takenRows.has(pair.rowIdx) || claimed.has(pair.targetId)) continue;
    takenRows.add(pair.rowIdx);
    claimed.add(pair.targetId);
    nextRows[pair.rowIdx] = {
      ...nextRows[pair.rowIdx],
      status: 'proposed',
      targetId: pair.targetId,
    };
  }

  // Ordered CTA fallback: remaining cta* labels → remaining CTA targets by document order.
  const freeCtaTargets = targets.filter((t) => isCtaishTarget(t) && !claimed.has(t.id));
  let ctaIdx = 0;
  for (let i = 0; i < nextRows.length; i++) {
    const row = nextRows[i];
    if (row.status !== 'unmatched' || !isCtaishLabel(row.urlLabel)) continue;
    const target = freeCtaTargets[ctaIdx++];
    if (!target) break;
    claimed.add(target.id);
    nextRows[i] = {
      ...row,
      status: 'proposed',
      targetId: target.id,
    };
  }

  const unmatchedTargetIds = targets.filter((t) => !claimed.has(t.id)).map((t) => t.id);

  return { rows: nextRows, targets, unmatchedTargetIds };
}
