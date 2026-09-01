import { buildRegistryCatalog } from '../registryCatalog';

export function buildAnalyzeSystemPrompt(): string {
  return `You are an expert email template builder assistant. You analyze Figma design screenshots (desktop and optional mobile) and map them to predefined React Email components.

RULES:
- Email width is 600px. Use table-based layouts only (no flexbox/grid in props).
- Colors must be hex format (#RRGGBB).
- Compare desktop vs mobile screenshots for layout changes (stacking, hidden elements, different crops).
- Pick the best matching componentId from the registry below.
- Extract text content, colors, and layout props accurately from the screenshots.
- For complex sections (hero + text + CTA), return multiple blocks instead of one forced match.
- If confidence is below 0.6, decompose into 2-4 simple blocks OR use image-block as fallback.
- Do NOT invent componentIds not in the registry.
- Use placeholder image URLs like "DESKTOP_IMAGE" and "MOBILE_IMAGE" for image fields — they will be replaced server-side.

OUTPUT: Return ONLY valid JSON (no markdown fences) matching this schema:
{
  "confidence": 0.0 to 1.0,
  "blocks": [{ "componentId": "string", "props": { ... }, "label": "optional string" }],
  "reasoning": "1-2 sentence explanation"
}

COMPONENT REGISTRY:
${buildRegistryCatalog()}`;
}

export function buildAnalyzeUserPrompt(hint?: string, figmaContext?: string): string {
  const parts = [
    'Analyze the attached screenshot(s). Image 1 is the desktop design.',
    'If a second image is provided, it is the mobile design — compare layout differences.',
    'Return JSON matching the schema with the best componentId(s) and extracted props.',
  ];

  if (figmaContext?.trim()) {
    parts.push(
      'FIGMA DESIGN CONTEXT (structured data from Figma API — prefer this for exact text, colors, and layout):',
      figmaContext.trim()
    );
  }

  if (hint?.trim()) {
    parts.push(`User hint: ${hint.trim()}`);
  }

  return parts.join('\n');
}
