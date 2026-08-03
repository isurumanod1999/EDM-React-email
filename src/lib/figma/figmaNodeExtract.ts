import type { ParsedFigmaNode } from './parseFigmaNode';
import { hasButtonVisualStructure } from './parseFigmaNode';
import { normalizedLayerKey } from './figmaNameNormalize';

export function walkNodes(
  node: ParsedFigmaNode,
  visit: (node: ParsedFigmaNode, depth: number) => void,
  depth = 0
): void {
  visit(node, depth);
  for (const child of node.children) {
    if (child.visible === false) continue;
    walkNodes(child, visit, depth + 1);
  }
}

export function findNodes(
  root: ParsedFigmaNode,
  predicate: (node: ParsedFigmaNode) => boolean
): ParsedFigmaNode[] {
  const found: ParsedFigmaNode[] = [];
  walkNodes(root, (node) => {
    if (predicate(node)) found.push(node);
  });
  return found;
}

export function findFirst(
  root: ParsedFigmaNode,
  predicate: (node: ParsedFigmaNode) => boolean
): ParsedFigmaNode | undefined {
  let match: ParsedFigmaNode | undefined;
  walkNodes(root, (node) => {
    if (!match && predicate(node)) match = node;
  });
  return match;
}

export function nameMatches(node: ParsedFigmaNode, pattern: RegExp): boolean {
  return pattern.test(node.name.trim());
}

export function findByNamePattern(root: ParsedFigmaNode, pattern: RegExp): ParsedFigmaNode | undefined {
  return findFirst(root, (n) => nameMatches(n, pattern));
}

export function findAllTextNodes(root: ParsedFigmaNode): ParsedFigmaNode[] {
  return findNodes(root, (n) => Boolean(n.text?.trim()));
}

export function nodeArea(node: ParsedFigmaNode): number {
  return (node.width ?? 0) * (node.height ?? 0);
}

export function imageUrl(node: ParsedFigmaNode): string | undefined {
  return node.exportUrl ?? node.forcedExportUrl;
}

export function findLargestImage(root: ParsedFigmaNode): ParsedFigmaNode | undefined {
  const candidates = findNodes(
    root,
    (n) => Boolean(imageUrl(n) || n.imageRef || n.type === 'IMAGE')
  );
  if (candidates.length === 0) return undefined;
  return candidates.sort((a, b) => nodeArea(b) - nodeArea(a))[0];
}

export function findImageByName(root: ParsedFigmaNode, pattern: RegExp): ParsedFigmaNode | undefined {
  const named = findFirst(
    root,
    (n) => nameMatches(n, pattern) && Boolean(imageUrl(n) || n.imageRef || n.type === 'IMAGE')
  );
  return named ?? findLargestImage(root);
}

export function rankTextNodes(root: ParsedFigmaNode): ParsedFigmaNode[] {
  return findAllTextNodes(root).sort((a, b) => {
    const sizeDiff = (b.fontSize ?? 0) - (a.fontSize ?? 0);
    if (sizeDiff !== 0) return sizeDiff;
    return (b.fontWeight ?? 400) - (a.fontWeight ?? 400);
  });
}

export function headlineText(root: ParsedFigmaNode): string | undefined {
  return (
    textByNamePattern(root, /headline|heading|title|h1|optional heading/i) ??
    rankTextNodes(root)[0]?.text?.trim()
  );
}

export function bodyTextNodes(root: ParsedFigmaNode, exclude?: string): ParsedFigmaNode[] {
  const headline = exclude ?? headlineText(root);
  return rankTextNodes(root).filter((t) => t.text?.trim() && t.text.trim() !== headline);
}

/** Horizontal layout columns or repeated card instances. */
export function findColumnNodes(root: ParsedFigmaNode): ParsedFigmaNode[] {
  const kids = visibleChildren(root);

  if (root.layoutMode === 'HORIZONTAL' && kids.length >= 2) {
    return kids.filter((c) => c.type !== 'TEXT');
  }

  if (kids.length === 1) {
    const inner = kids[0];
    if (inner.layoutMode === 'HORIZONTAL') {
      const innerKids = visibleChildren(inner).filter((c) => c.type !== 'TEXT');
      if (innerKids.length >= 2) return innerKids;
    }
  }

  const instances = kids.filter(
    (c) =>
      c.type === 'INSTANCE' ||
      c.type === 'COMPONENT' ||
      (c.type === 'FRAME' && visibleChildren(c).length > 0)
  );
  if (instances.length >= 2) return instances;

  if (instances.length === 1 && visibleChildren(instances[0]).length >= 2) {
    const innerKids = visibleChildren(instances[0]).filter((c) => c.type !== 'TEXT');
    if (innerKids.length >= 2) return innerKids;
  }

  const frameKids = kids.filter((c) => c.type === 'FRAME' || c.type === 'INSTANCE');
  if (frameKids.length >= 2) {
    const widths = frameKids.map((c) => c.width ?? 0).filter((w) => w > 0);
    if (widths.length >= 2) {
      const avg = widths.reduce((sum, w) => sum + w, 0) / widths.length;
      const similar = frameKids.filter((c) => {
        const w = c.width ?? 0;
        return w > 0 && Math.abs(w - avg) / avg <= 0.3;
      });
      if (similar.length >= 2) return similar;
    }
    return frameKids;
  }

  return [];
}

export function columnCount(root: ParsedFigmaNode): number {
  return findColumnNodes(root).length;
}

export function primaryText(node: ParsedFigmaNode): string | undefined {
  const text = node.text?.trim();
  if (text) return text;
  const texts = findAllTextNodes(node);
  if (texts.length === 0) return undefined;
  return rankTextNodes(node)[0]?.text?.trim();
}

export function textByNamePattern(root: ParsedFigmaNode, pattern: RegExp): string | undefined {
  const node = findByNamePattern(root, pattern);
  if (!node) return undefined;
  return primaryText(node) ?? node.text?.trim();
}

export function findLinkHref(node: ParsedFigmaNode): string | undefined {
  if (node.runs) {
    for (const run of node.runs) {
      if (run.href) return run.href;
    }
  }
  for (const child of node.children) {
    const href = findLinkHref(child);
    if (href) return href;
  }
  return undefined;
}

export interface ButtonInfo {
  text: string;
  url?: string;
}

const BUTTON_NAME = /button|cta|btn|primary|secondary|pill|action/i;
const CTA_PHRASE =
  /shop now|learn more|get started|book now|find out|discover|explore|view|buy now|sign up|register|contact|request a quote/i;

function looksLikeButton(node: ParsedFigmaNode): boolean {
  if (BUTTON_NAME.test(node.name)) {
    const label = primaryText(node) ?? node.text?.trim();
    if (label && label.length <= 60) return true;
  }

  const h = node.height ?? 0;
  if (h > 140 || h <= 0) return false;
  if (BUTTON_NAME.test(node.name)) return true;
  if (hasButtonVisualStructure(node)) return true;
  const label = primaryText(node);
  if (label && label.length <= 60 && CTA_PHRASE.test(label)) return true;
  if (node.cornerRadius && node.cornerRadius >= 4 && label && label.length <= 40) return true;
  return false;
}

export function findButtons(root: ParsedFigmaNode): ButtonInfo[] {
  const buttons: ButtonInfo[] = [];
  walkNodes(root, (node) => {
    if (!looksLikeButton(node)) return;
    const text = primaryText(node);
    if (!text) return;
    buttons.push({ text, url: findLinkHref(node) });
  });
  return buttons;
}

export function findPrimaryButton(root: ParsedFigmaNode): ButtonInfo | undefined {
  const named = findByNamePattern(root, BUTTON_NAME);
  if (named) {
    const text = primaryText(named);
    if (text) return { text, url: findLinkHref(named) };
  }
  return findButtons(root)[0];
}

/** Unwrap single-child wrapper frames so INSTANCE matching hits the real component. */
export function unwrapWrapper(node: ParsedFigmaNode): ParsedFigmaNode {
  const kids = node.children.filter((c) => c.visible !== false);
  if (
    kids.length === 1 &&
    /^(frame|group|container|wrapper|auto layout|section|content|row|col|card|stack|grid|layout|content area)/i.test(
      node.name.trim()
    )
  ) {
    return unwrapWrapper(kids[0]);
  }
  return node;
}

export function visibleChildren(node: ParsedFigmaNode): ParsedFigmaNode[] {
  return node.children.filter((c) => c.visible !== false);
}

export function matchMobileChild(
  desktopChild: ParsedFigmaNode,
  mobileRoot?: ParsedFigmaNode,
  desktopRoot?: ParsedFigmaNode
): ParsedFigmaNode | undefined {
  if (!mobileRoot) return undefined;
  const mobileKids = visibleChildren(mobileRoot);
  const desktopKey = normalizedLayerKey(desktopChild.name);

  if (desktopChild.componentId) {
    const byComponentId = mobileKids.find((c) => c.componentId === desktopChild.componentId);
    if (byComponentId) return byComponentId;
  }

  const byName = mobileKids.find(
    (c) =>
      c.name.trim() === desktopChild.name.trim() ||
      normalizedLayerKey(c.name) === desktopKey
  );
  if (byName) return byName;

  if (desktopRoot) {
    const desktopKids = visibleChildren(desktopRoot);
    const idx = desktopKids.findIndex((c) => c.id === desktopChild.id);
    if (idx >= 0 && idx < mobileKids.length) return mobileKids[idx];
  }

  if (mobileKids.length === 1) return mobileKids[0];
  return undefined;
}

export function mobileImageUrl(
  desktopNode: ParsedFigmaNode,
  mobileRoot?: ParsedFigmaNode
): string | undefined {
  const mobileChild = matchMobileChild(desktopNode, mobileRoot);
  if (!mobileChild) return undefined;
  return imageUrl(mobileChild) ?? findLargestImage(mobileChild)?.exportUrl;
}
