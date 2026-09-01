/** Tagging Excel row + mapping model (AD-13 / AD-14). */

export type TaggingRowStatus = 'proposed' | 'unmatched' | 'skipped' | 'confirmed' | 'applied';

export interface TaggingRow {
  rowIndex: number;
  finalUrl: string;
  urlLabel: string;
  altText?: string;
  status: TaggingRowStatus;
  skipReason?: string;
  /** Set after match / rematch (AD-14). */
  targetId?: string;
  raw: Record<string, string>;
}

export interface ParseTaggingResult {
  rows: TaggingRow[];
  sheetName?: string;
}

export type LinkableTargetKind = 'url' | 'social' | 'tree';

/** One writable URL destination on the open template (AD-14 / linkable-targets). */
export interface LinkableTarget {
  id: string;
  blockId: string;
  componentId: string;
  /** Registry prop key, or `socialLinks` / `tree` for nested writes. */
  propKey: string;
  kind: LinkableTargetKind;
  displayName: string;
  currentUrl?: string;
  /** Paired alt prop on the same block (registry targets only). */
  altPropKey?: string;
  /** Normalized keys used for URL Label matching. */
  matchKeys: string[];
  /** Tree node type when kind === 'tree'. */
  nodeType?: string;
}

export interface MatchTaggingResult {
  rows: TaggingRow[];
  targets: LinkableTarget[];
  unmatchedTargetIds: string[];
}

export interface ConfirmedMapping {
  rowIndex: number;
  targetId: string;
  finalUrl: string;
  altText?: string;
  urlLabel: string;
}

export interface ApplyMappingsResult {
  template: import('@/lib/schema/template').EmailTemplateDocument;
  applied: ConfirmedMapping[];
  warnings: string[];
}

/** Collapse whitespace/newlines for Book1 multi-line headers. */
export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Normalize URL Label / hint for equality matching (AD-14). */
export function normalizeMatchKey(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export type HeaderField = 'finalUrl' | 'urlLabel' | 'altText';

/** Map a normalized header cell to a logical field. */
export function mapHeaderToField(normalized: string): HeaderField | null {
  if (!normalized) return null;
  if (normalized === 'final url' || normalized.startsWith('final url')) return 'finalUrl';
  if (normalized === 'url label' || normalized.startsWith('url label')) return 'urlLabel';
  if (normalized === 'alt text' || normalized.startsWith('alt text')) return 'altText';
  return null;
}

/**
 * FINAL URL is usable for apply when it looks like http(s).
 * CRM include tokens (Mirror/Unsubscribe) are skipped (AD-18).
 */
export function classifyFinalUrl(finalUrl: string): { ok: true } | { ok: false; reason: string } {
  const trimmed = finalUrl.trim();
  if (!trimmed) {
    return { ok: false, reason: 'Missing FINAL URL' };
  }
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('<%@') ||
    lower.includes('mirrorpageurl') ||
    lower.includes('nmalcunsubsciptionurl') ||
    lower.includes('nmalcunsubscriptionurl')
  ) {
    return { ok: false, reason: 'CRM include row (not an http FINAL URL)' };
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, reason: 'FINAL URL is not an http(s) URL' };
  }
  return { ok: true };
}

/** Registry URL prop → paired alt prop (linkable-targets companion). */
export const URL_ALT_PROP: Record<string, string> = {
  logoUrl: 'logoAlt',
  url: 'altText',
};

/** Visible text props that must never be overwritten from URL Label (AD-15). */
export const CTA_TEXT_PROPS = new Set([
  'ctaText',
  'buttonText',
  'primaryText',
  'secondaryText',
  'label',
]);
