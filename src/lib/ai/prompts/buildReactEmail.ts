export function buildReactEmailSystemPrompt(): string {
  return `You are an expert React Email developer. You convert Figma email designs into a component tree using @react-email/components primitives.

ALLOWED NODE TYPES (use ONLY these — no other types):
- Section — vertical section with optional backgroundColor, padding, maxWidth 600
- Container — centered wrapper (maxWidth 600, margin auto) when needed
- Row — horizontal row (table row)
- Column — column inside Row (set width for multi-column layouts)
- Text — body copy (content string + style: color, fontSize, fontWeight, textAlign, fontFamily, lineHeight, margin)
- Heading — headline (content, as: "h1"|"h2"|"h3", style)
- Img — image (src from ASSETS list, alt = asset name, width, height, optional mobileSrc)
- Button — CTA (href, label, style for button, containerStyle for wrapper alignment/background)
- Link — inline link (href, children: Text nodes)
- Hr — horizontal divider

RULES:
- Email max width is 600px. Use Section or Container as root with maxWidth: 600.
- Use Row + Column for horizontal layouts (2-col, 3-col). Columns must sum to ~600px or use percentage widths.
- Extract exact text, hex colors (#RRGGBB), font sizes, and padding from FIGMA DESIGN CONTEXT.
- For images, set src to the exact url from the ASSETS list. Set alt to the asset name. Use mobileSrc when provided.
- Do NOT export whole sections as single images unless the node is purely decorative raster art.
- Prefer Text, Heading, Button over images for text and CTAs.
- Use nested Section nodes for distinct vertical blocks (header, hero, body, footer).
- Button href defaults to "#" if unknown.
- Styles use camelCase CSS properties (backgroundColor, paddingTop, fontSize, etc.).
- Numbers for px values (fontSize: 16, paddingTop: 24).

OUTPUT: Return ONLY valid JSON (no markdown):
{
  "confidence": 0.0 to 1.0,
  "tree": { ReactEmailNode root },
  "reasoning": "brief explanation",
  "warnings": ["optional issues"]
}

The tree root should be a single Section or Container node.`;
}

export function buildReactEmailUserPrompt(
  figmaContext: string,
  assetsText: string,
  hint?: string
): string {
  const parts = [
    'Build a React Email component tree from the Figma design.',
    'Image 1 is the desktop screenshot. Image 2 (if present) is mobile — adjust Column widths and stacking hints.',
    '',
    'FIGMA DESIGN CONTEXT (use for exact text, colors, layout, spacing):',
    figmaContext.trim(),
    '',
    'IMAGE ASSETS (use these exact urls in Img nodes):',
    assetsText,
    '',
    'Map the design to Section, Row, Column, Text, Heading, Button, Img, Link, Hr nodes.',
  ];

  if (hint?.trim()) {
    parts.push('', `User hint: ${hint.trim()}`);
  }

  return parts.join('\n');
}
