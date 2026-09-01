/**
 * Break very long HTML lines so downstream ESP compilers can ingest the export.
 *
 * Adobe Campaign turns `htmlContent` into JavaScript `document.writeraw("…")`
 * calls one source line at a time. React Email renders the whole `<body>` on a
 * single line (10k+ chars is normal), which overflows that per-line buffer and
 * truncates the string mid-attribute — surfacing as "unterminated string
 * literal" (JST-310000).
 *
 * Every break swaps an existing space for a newline, never adds or drops
 * characters, so the document is byte-identical once newlines collapse back to
 * spaces. Breaks are only taken where whitespace is insignificant:
 *
 * - between attributes inside a tag, never inside a quoted value (a raw newline
 *   in an `href` is what breaks Adobe Campaign's link tracking in the first place)
 * - inside normal text, where a newline collapses to the same single space —
 *   but never under `white-space: pre*`, where it would become a visible break
 *
 * We never break between `>` and `<`, which would inject collapsible whitespace
 * between elements and reintroduce the classic image-gap bug.
 */

const DEFAULT_MAX_LINE_LENGTH = 500;

const PRESERVES_WHITESPACE = /white-space\s*:\s*(?:pre|pre-line|pre-wrap|break-spaces)/i;

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** Length of the trailing line of `chunk`, continuing from `current`. */
function tailLength(current: number, chunk: string): number {
  const lastBreak = chunk.lastIndexOf('\n');
  return lastBreak === -1 ? current + chunk.length : chunk.length - lastBreak - 1;
}

/** Emit a single tag, converting attribute separators to breaks past the limit. */
function emitTag(
  tag: string,
  lineLength: number,
  maxLineLength: number
): { text: string; lineLength: number } {
  let out = '';
  let length = lineLength;
  let quote: string | null = null;

  for (let i = 0; i < tag.length; i++) {
    const char = tag[i];

    if (quote) {
      if (char === quote) quote = null;
      out += char;
      length++;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      out += char;
      length++;
      continue;
    }

    // Never break immediately before `>` / `/>`, which would strand the close.
    if (char === ' ' && length >= maxLineLength && !/^\/?>/.test(tag.slice(i + 1))) {
      out += '\n';
      length = 0;
      continue;
    }

    out += char;
    length++;
  }

  return { text: out, lineLength: length };
}

/** Index just past the tag starting at `start`, honouring quoted values. */
function findTagEnd(html: string, start: number): number {
  let quote: string | null = null;
  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return i + 1;
    }
  }
  return html.length;
}

export function wrapHtmlLines(html: string, maxLineLength = DEFAULT_MAX_LINE_LENGTH): string {
  let out = '';
  let lineLength = 0;
  let i = 0;

  // One entry per open element, recording whether it preserves whitespace.
  const openElements: boolean[] = [];
  let preserveDepth = 0;

  while (i < html.length) {
    const char = html[i];

    if (char !== '<') {
      // A newline here collapses to the space it replaces, except under `pre*`.
      if (char === ' ' && lineLength >= maxLineLength && preserveDepth === 0) {
        out += '\n';
        lineLength = 0;
        i++;
        continue;
      }
      out += char;
      lineLength = char === '\n' ? 0 : lineLength + 1;
      i++;
      continue;
    }

    // Comments — including MSO conditionals — are copied verbatim.
    if (html.startsWith('<!--', i)) {
      const close = html.indexOf('-->', i + 4);
      const end = close === -1 ? html.length : close + 3;
      const chunk = html.slice(i, end);
      out += chunk;
      lineLength = tailLength(lineLength, chunk);
      i = end;
      continue;
    }

    const tagEnd = findTagEnd(html, i);
    const rawTag = html.slice(i, tagEnd);
    const emitted = emitTag(rawTag, lineLength, maxLineLength);
    out += emitted.text;
    lineLength = emitted.lineLength;
    i = tagEnd;

    const closing = /^<\/\s*([a-zA-Z][^\s/>]*)/.exec(rawTag);
    if (closing) {
      if (openElements.pop()) preserveDepth--;
    } else {
      const opening = /^<\s*([a-zA-Z][^\s/>]*)/.exec(rawTag);
      const name = opening?.[1]?.toLowerCase();
      if (name && !VOID_ELEMENTS.has(name) && !/\/>$/.test(rawTag)) {
        const preserves = PRESERVES_WHITESPACE.test(rawTag) || name === 'pre' || name === 'textarea';
        openElements.push(preserves);
        if (preserves) preserveDepth++;
      }
    }

    // Raw-text elements keep their body untouched (CSS/JS is not markup).
    const rawText = /^<(style|script)\b/i.exec(rawTag)?.[1];
    if (rawText) {
      const closeTag = `</${rawText}`;
      const close = html.toLowerCase().indexOf(closeTag.toLowerCase(), i);
      const end = close === -1 ? html.length : close;
      const body = html.slice(i, end);
      out += body;
      lineLength = tailLength(lineLength, body);
      i = end;
    }
  }

  return out;
}
