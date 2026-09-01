import { getTextClassifierProvider } from './provider';
import type { ImageNodeOutlineEntry } from '@/lib/figma/detectImageNodes';

/**
 * AI image-node classifier for mixed-mode export.
 *
 * Given a compact outline of a Figma component's nodes plus a free-form user
 * instruction, ask the configured AI provider which nodes should be flattened to
 * raster images (icons, logos, SVGs, decorative badges, complex/gradient
 * graphics) while text and simple layout stay structured. This is a TEXT-only
 * call (no images), so it reuses the existing provider selection but sends an
 * empty `images` array.
 *
 * It NEVER throws: on any provider error or unparseable output it returns an
 * empty id list plus an `error` string, so callers can silently fall back to the
 * deterministic heuristic (`detectImageNodeIds`).
 */

export interface ClassifyImageNodesInput {
  nodes: ImageNodeOutlineEntry[];
  instruction: string;
}

export interface ClassifyImageNodesResult {
  ids: string[];
  error?: string;
}

/** Robustly pull a JSON array out of a model response (strips code fences/prose). */
function extractJsonArray(text: string): unknown {
  const cleaned = text
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();

  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  const slice = start !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice);
}

const SYSTEM_PROMPT =
  'You are a precise UI classifier for an email builder. You decide which Figma ' +
  'nodes should be exported as flat raster PNG images (icons, logos, SVGs, ' +
  'decorative badges, gradient or otherwise complex graphics) versus kept as ' +
  'structured, editable HTML (text, headings, simple layout, buttons). ' +
  'Respond with ONLY a JSON array of node id strings and nothing else.';

function buildUserPrompt(input: ClassifyImageNodesInput): string {
  const nodeLines = input.nodes
    .map((n) => {
      const size = `${Math.round(n.width ?? 0)}x${Math.round(n.height ?? 0)}`;
      const text = n.text ? ` text=${JSON.stringify(n.text)}` : '';
      return `- id="${n.id}" name=${JSON.stringify(n.name)} type=${n.type} size=${size}${text}`;
    })
    .join('\n');

  return (
    `User instruction: ${input.instruction.trim() || '(none — use your best judgment)'}\n\n` +
    `Nodes:\n${nodeLines}\n\n` +
    'Return a JSON array of the node IDs that should be exported as flat raster ' +
    'images (icons, logos, SVGs, decorative badges, gradient/complex graphics), ' +
    "based on the user's instruction and the node list. Text and simple layout " +
    'must stay structured. Example: ["12:3","12:8"]. If none apply, return [].'
  );
}

export async function classifyImageNodeIds(
  input: ClassifyImageNodesInput
): Promise<ClassifyImageNodesResult> {
  const validIds = new Set(input.nodes.map((n) => n.id));
  if (validIds.size === 0) return { ids: [] };

  try {
    const provider = getTextClassifierProvider();
    const raw = await provider.analyze({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(input),
      images: [], // text-only classification
    });

    const parsed = extractJsonArray(raw);
    if (!Array.isArray(parsed)) {
      return { ids: [], error: 'AI did not return a JSON array' };
    }

    // Accept both ["id", …] and [{ id: "…" }, …]; keep only ids that exist in the
    // supplied outline so a hallucinated id can never reach the build.
    const ids = parsed
      .map((v) => {
        if (typeof v === 'string') return v;
        if (v && typeof v === 'object' && 'id' in v) return String((v as { id: unknown }).id);
        return '';
      })
      .filter((id) => id && validIds.has(id));

    return { ids: [...new Set(ids)] };
  } catch (err) {
    return { ids: [], error: err instanceof Error ? err.message : String(err) };
  }
}
