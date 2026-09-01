import type { FigmaNodeDocument } from './client';
import { visibleDocumentChildren } from './parseFigmaNode';

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function extractFillColor(node: FigmaNodeDocument): string | undefined {
  const fill = node.fills?.find((f) => f.type === 'SOLID' && f.color);
  if (!fill?.color) return undefined;
  return rgbToHex(fill.color.r, fill.color.g, fill.color.b);
}

function summarizeNode(node: FigmaNodeDocument, depth = 0): string[] {
  const lines: string[] = [];
  const indent = '  '.repeat(depth);
  const box = node.absoluteBoundingBox;
  const size =
    box?.width != null && box?.height != null
      ? ` ${Math.round(box.width)}×${Math.round(box.height)}px`
      : '';

  let line = `${indent}- ${node.type} "${node.name}"${size}`;
  const bg = extractFillColor(node);
  if (bg) line += ` bg=${bg}`;

  if (node.characters?.trim()) {
    const text = node.characters.trim().replace(/\s+/g, ' ').slice(0, 120);
    line += ` text="${text}"`;
  }

  if (node.layoutMode) {
    line += ` layout=${node.layoutMode}`;
    if (node.itemSpacing != null) line += ` gap=${node.itemSpacing}`;
  }

  lines.push(line);

  // Hidden and fully clipped layers are described to the AI and to the image
  // detector as if they were on screen, which is how switched-off social rows
  // end up in the output. Use the parser's rule so context and build agree.
  for (const child of visibleDocumentChildren(node)) {
    if (depth < 6) {
      lines.push(...summarizeNode(child, depth + 1));
    }
  }

  return lines;
}

export function extractDesignContext(document: FigmaNodeDocument): string {
  const header = [
    `Frame: "${document.name}"`,
    document.absoluteBoundingBox
      ? `Size: ${Math.round(document.absoluteBoundingBox.width ?? 0)}×${Math.round(document.absoluteBoundingBox.height ?? 0)}px`
      : null,
    document.layoutMode ? `Layout: ${document.layoutMode}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `${header}\n\nStructure:\n${summarizeNode(document).join('\n')}`;
}
