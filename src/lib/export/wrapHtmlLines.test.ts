import { describe, expect, it } from 'vitest';
import { wrapHtmlLines } from '@/lib/export/wrapHtmlLines';

const LONG_STYLE =
  'display:block;outline:none;border:none;text-decoration:none;width:100%;max-width:100%;height:auto';

function longDocument(): string {
  const images = Array.from(
    { length: 12 },
    (_, i) =>
      `<img class="figma-frame-img-b29069b7-desk" alt="header" height="160" src="https://cdn.example/${i}.png" style="${LONG_STYLE}" width="600"/>`
  ).join('');
  return `<html><body><a href="https://www.nissan.com.au/vehicles" style="color:#067df7;text-decoration-line:none;display:block" target="_blank">${images}</a></body></html>`;
}

/** Only spaces become newlines, so collapsing breaks must restore the source. */
function collapse(html: string): string {
  return html.replace(/\n/g, ' ');
}

describe('wrapHtmlLines', () => {
  it('breaks a single mega-line into ESP-safe lines', () => {
    const input = longDocument();
    expect(Math.max(...input.split('\n').map((l) => l.length))).toBeGreaterThan(1000);

    const output = wrapHtmlLines(input, 200);
    const longest = Math.max(...output.split('\n').map((l) => l.length));

    expect(output.split('\n').length).toBeGreaterThan(1);
    expect(longest).toBeLessThan(600);
  });

  it('changes nothing but whitespace inside tags', () => {
    const input = longDocument();
    expect(collapse(wrapHtmlLines(input, 200))).toBe(collapse(input));
  });

  it('never puts a newline inside a quoted attribute value', () => {
    const output = wrapHtmlLines(longDocument(), 60);
    expect(/="[^"]*\n[^"]*"/.test(output)).toBe(false);
    expect(output).toContain('href="https://www.nissan.com.au/vehicles"');
  });

  it('never inserts whitespace between adjacent elements', () => {
    const output = wrapHtmlLines(longDocument(), 60);
    // A break between `>` and `<` would render as a collapsible space (image gap).
    expect(/>\s+</.test(output)).toBe(false);
  });

  it('leaves MSO conditional comments and style bodies untouched', () => {
    const input = `<head><style type="text/css">.a{color:red}\n.b{color:blue}</style></head><body><!--[if mso]><table role="presentation" width="600" style="${LONG_STYLE}"><tr><td>x</td></tr></table><![endif]--><p>hi</p></body>`;
    const output = wrapHtmlLines(input, 40);

    expect(output).toContain('<!--[if mso]>');
    expect(output).toContain('<![endif]-->');
    expect(output).toContain('.a{color:red}\n.b{color:blue}');
    expect(collapse(output)).toBe(collapse(input));
  });

  it('is a no-op for already-short markup', () => {
    const input = '<p style="margin:0">hello world</p>';
    expect(wrapHtmlLines(input, 500)).toBe(input);
  });

  it('breaks long prose so no line stays oversized', () => {
    const prose = 'terms and conditions apply please visit the site for details '.repeat(20);
    const output = wrapHtmlLines(`<p style="margin:0">${prose}</p>`, 200);

    expect(Math.max(...output.split('\n').map((l) => l.length))).toBeLessThan(400);
    expect(collapse(output)).toBe(collapse(`<p style="margin:0">${prose}</p>`));
  });

  it('keeps white-space:pre-line text on one line', () => {
    // Under pre-line a newline renders as a real break, so it must not be used.
    const prose = 'disclaimer sentence that keeps going and going and going '.repeat(20);
    const input = `<p style="white-space:pre-line;margin:0">${prose}</p>`;
    const output = wrapHtmlLines(input, 100);

    expect(output).toContain(prose);
  });

  it('resumes breaking after a pre-line element closes', () => {
    const prose = 'plain text that should still be wrapped after the pre block '.repeat(20);
    const input = `<div><p style="white-space:pre-line">keep me intact</p><p>${prose}</p></div>`;
    const output = wrapHtmlLines(input, 150);

    expect(output).toContain('keep me intact');
    expect(Math.max(...output.split('\n').map((l) => l.length))).toBeLessThan(400);
  });
});
