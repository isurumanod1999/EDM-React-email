import { printJsLiteral } from '@/lib/codeview/styleLiteral';
import { STYLE_BAG_ATTRS } from '@/lib/codeview/nodeSchema';

/**
 * Strings safe as a bare JSX attribute (`content="Hi"`).
 *
 * JSX attribute strings have no backslash escapes and DO decode HTML entities,
 * so anything containing quotes, `&`, angle brackets, braces, backslashes or
 * newlines must use expression form `{"…"}` to survive the round trip.
 */
const PLAIN_ATTR_STRING = /^[^"'&<>{}\\\n\r\t]*$/;

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Expand an object literal one key per line, anchored at `col`. */
function printObjectBlock(
  value: Record<string, unknown>,
  col: number,
  indentSize: number
): string {
  const inner = ' '.repeat(col + indentSize);
  const body = Object.keys(value)
    .sort()
    .map((k) => `${inner}${IDENTIFIER.test(k) ? k : JSON.stringify(k)}: ${printJsLiteral(value[k])}`)
    .join(',\n');
  return `{\n${body}\n${' '.repeat(col)}}`;
}

/**
 * One JSX attribute, or null when the value should be omitted.
 *
 * `col` is the column the attribute starts at; object literals wider than the
 * remaining budget expand across lines instead of running off the edge.
 */
export function printAttr(
  name: string,
  value: unknown,
  col = 0,
  indentSize = 2,
  maxLineLength = Number.POSITIVE_INFINITY
): string | null {
  if (value === undefined || value === null) return null;

  if (STYLE_BAG_ATTRS.has(name)) {
    if (!isPlainObject(value) || Object.keys(value).length === 0) return null;
    const compact = `${name}={${printJsLiteral(value)}}`;
    if (col + compact.length <= maxLineLength) return compact;
    return `${name}={${printObjectBlock(value, col, indentSize)}}`;
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return `${name}={${value}}`;
  }

  if (typeof value === 'string') {
    return PLAIN_ATTR_STRING.test(value)
      ? `${name}="${value}"`
      : `${name}={${JSON.stringify(value)}}`;
  }

  const compact = `${name}={${printJsLiteral(value)}}`;
  if (isPlainObject(value) && col + compact.length > maxLineLength) {
    return `${name}={${printObjectBlock(value, col, indentSize)}}`;
  }
  return compact;
}

export function compactAttrs(parts: Array<string | null>): string[] {
  return parts.filter((p): p is string => Boolean(p));
}

/** Attribute name/value pairs, printed lazily so we can re-run at a known column. */
export type AttrSpec = [name: string, value: unknown];

/**
 * Render an opening (or self-closing) tag.
 *
 * Tries a single line first; if that overflows, re-prints attributes at their
 * real indent (so long style objects can expand) and stacks them one per line.
 */
export function renderTag(
  tag: string,
  specs: AttrSpec[],
  indent: string,
  selfClosing: boolean,
  indentSize: number,
  maxLineLength: number
): string {
  const tail = selfClosing ? ' />' : '>';
  const compact = compactAttrs(specs.map(([n, v]) => printAttr(n, v)));
  const oneLine = `${indent}<${tag}${compact.length ? ` ${compact.join(' ')}` : ''}${tail}`;
  if (compact.length === 0 || oneLine.length <= maxLineLength) return oneLine;

  const attrIndent = indent + ' '.repeat(indentSize);
  const stacked = compactAttrs(
    specs.map(([n, v]) => printAttr(n, v, attrIndent.length, indentSize, maxLineLength))
  );
  const body = stacked.map((a) => `${attrIndent}${a}`).join('\n');
  return `${indent}<${tag}\n${body}\n${indent}${selfClosing ? '/>' : '>'}`;
}
