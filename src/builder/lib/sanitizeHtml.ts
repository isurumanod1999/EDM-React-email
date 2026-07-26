/**
 * Allowlist sanitizer for rich-text produced by the in-app editor.
 *
 * The editor's `contentEditable` output is normalised down to a small set of
 * email-safe tags + inline styles before it's stored on a node. Everything
 * outside the allowlist is unwrapped (keeps the text, drops the tag) or removed
 * (for genuinely unsafe elements). Runs in the browser only — it relies on
 * `DOMParser`; on the server it's a no-op passthrough of the empty string.
 */

const ALLOWED_TAGS = new Set([
  'p', 'div', 'br', 'span',
  'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del',
  'a', 'ul', 'ol', 'li',
]);

// Elements that must be dropped entirely (with their subtree).
const DROP_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'img', 'video', 'audio',
  'form', 'input', 'button', 'link', 'meta', 'svg',
]);

// Inline CSS properties an email client can be trusted to render.
const ALLOWED_STYLE_PROPS = new Set([
  'color',
  'background-color',
  'font-size',
  'font-weight',
  'font-style',
  'font-family',
  'text-decoration',
  'text-decoration-line',
  'text-align',
  'line-height',
  'letter-spacing',
]);

function isSafeHref(href: string): boolean {
  const v = href.trim();
  if (v === '') return false;
  // Relative / anchor / protocol-relative links are fine.
  if (/^(\/|#|\.\/|\.\.\/)/.test(v)) return true;
  if (/^\/\//.test(v)) return true;
  return /^(https?:|mailto:|tel:)/i.test(v);
}

function filterStyle(styleText: string): string {
  const out: string[] = [];
  for (const decl of styleText.split(';')) {
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue;
    // Reject anything that could smuggle a URL or expression.
    if (/url\(|expression|javascript:|@import|[<>]/i.test(value)) continue;
    if (value) out.push(`${prop}: ${value}`);
  }
  return out.join('; ');
}

function unwrap(el: Element): void {
  const parent = el.parentNode;
  if (!parent) {
    el.remove();
    return;
  }
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function sanitizeElement(el: Element): void {
  // Depth-first: sanitize children before deciding this element's fate, so
  // unwrapping doesn't skip nested content.
  for (const child of Array.from(el.children)) {
    sanitizeElement(child);
  }

  const tag = el.tagName.toLowerCase();

  if (DROP_TAGS.has(tag)) {
    el.remove();
    return;
  }

  if (!ALLOWED_TAGS.has(tag)) {
    unwrap(el);
    return;
  }

  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();

    if (name === 'style') {
      const filtered = filterStyle(attr.value);
      if (filtered) el.setAttribute('style', filtered);
      else el.removeAttribute('style');
      continue;
    }

    if (tag === 'a' && name === 'href') {
      if (!isSafeHref(attr.value)) el.removeAttribute('href');
      continue;
    }

    // Everything else (event handlers, class, id, data-*, target/rel we re-add) is stripped.
    el.removeAttribute(attr.name);
  }

  if (tag === 'a' && el.getAttribute('href')) {
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener noreferrer');
  }
}

/** Sanitize editor HTML down to the email-safe allowlist. */
export function sanitizeRichHtml(dirty: string): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(dirty, 'text/html');
  sanitizeElement(doc.body);
  return doc.body.innerHTML.trim();
}

/** Plain-text projection of HTML (for the node's `content` fallback + labels). */
export function htmlToPlainText(html: string): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Turn <br> and block boundaries into newlines so the fallback reads sanely.
  doc.body.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  doc.body.querySelectorAll('p, div, li').forEach((el) => el.append('\n'));
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
}

/** True when the HTML carries real formatting worth storing (not just plain text). */
export function hasRichFormatting(html: string): boolean {
  return /<(b|strong|i|em|u|s|strike|del|a|ul|ol|li|span|br)\b/i.test(html);
}

/** Escape plain text so it can seed the editor as HTML safely. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
