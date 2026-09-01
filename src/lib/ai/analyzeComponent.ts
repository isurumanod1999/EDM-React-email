import { promises as fs } from 'fs';
import path from 'path';
import { getComponentDefinition } from '@/lib/registry';
import { generateId } from '@/lib/utils/id';
import { getVisionProvider } from './provider';
import { buildAnalyzeSystemPrompt, buildAnalyzeUserPrompt } from './prompts/analyzeComponent';
import { VALID_COMPONENT_IDS } from './registryCatalog';
import {
  analyzeResultSchema,
  type AiBlock,
  type AnalyzeResult,
} from './schemas/analyzeResult';
import type { VisionImage } from './providers/types';

const LOW_CONFIDENCE_THRESHOLD = 0.6;

async function loadImageAsBase64(url: string): Promise<VisionImage> {
  const decoded = decodeURIComponent(url);
  const relative = decoded.startsWith('/') ? decoded.slice(1) : decoded;
  const filePath = path.join(process.cwd(), 'public', relative);

  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeType =
    ext === '.png'
      ? 'image/png'
      : ext === '.webp'
        ? 'image/webp'
        : ext === '.gif'
          ? 'image/gif'
          : 'image/jpeg';

  return { base64: buffer.toString('base64'), mimeType };
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function injectImageUrls(
  componentId: string,
  props: Record<string, unknown>,
  desktopUrl: string,
  mobileUrl?: string
): Record<string, unknown> {
  const def = getComponentDefinition(componentId);
  if (!def) return props;

  const mob = mobileUrl ?? desktopUrl;
  const result = { ...props };

  for (const field of def.fields) {
    if (field.type !== 'image') continue;
    const key = field.key.toLowerCase();
    if (key.includes('mob') || key.includes('mobile')) {
      result[field.key] = mob;
    } else {
      result[field.key] = desktopUrl;
    }
  }

  return result;
}

function normalizeBlockProps(
  componentId: string,
  aiProps: Record<string, unknown>
): Record<string, unknown> {
  const def = getComponentDefinition(componentId);
  if (!def) return aiProps;
  return { ...structuredClone(def.defaultProps as Record<string, unknown>), ...aiProps };
}

function buildImageFallbackBlock(desktopUrl: string, mobileUrl?: string): AiBlock {
  return {
    componentId: 'image-block',
    label: 'Screenshot Upload (Image)',
    props: {
      imgSrc: desktopUrl,
      mobileSrc: mobileUrl ?? desktopUrl,
      imgWidth: 520,
      altText: 'Imported design',
      backgroundColor: '#ffffff',
      align: 'center',
    },
  };
}

function sanitizeBlocks(
  raw: AnalyzeResult,
  desktopUrl: string,
  mobileUrl?: string
): AiBlock[] {
  let blocks = raw.blocks.filter((b) => VALID_COMPONENT_IDS.has(b.componentId));

  if (blocks.length === 0 || raw.confidence < LOW_CONFIDENCE_THRESHOLD) {
    if (blocks.length === 0) {
      blocks = [buildImageFallbackBlock(desktopUrl, mobileUrl)];
    }
  }

  return blocks.map((block) => {
    const def = getComponentDefinition(block.componentId);
    const props = injectImageUrls(
      block.componentId,
      normalizeBlockProps(block.componentId, block.props),
      desktopUrl,
      mobileUrl
    );

    return {
      componentId: block.componentId,
      label: block.label ?? def?.name ?? block.componentId,
      props,
    };
  });
}

export interface AnalyzeComponentInput {
  desktopUrl: string;
  mobileUrl?: string;
  hint?: string;
  figmaContext?: string;
}

export interface AnalyzeComponentOutput {
  confidence: number;
  blocks: AiBlock[];
  reasoning: string;
}

export async function analyzeComponent(
  input: AnalyzeComponentInput
): Promise<AnalyzeComponentOutput> {
  const images: VisionImage[] = [await loadImageAsBase64(input.desktopUrl)];

  if (input.mobileUrl && input.mobileUrl !== input.desktopUrl) {
    images.push(await loadImageAsBase64(input.mobileUrl));
  }

  const provider = getVisionProvider();

  let visionImages = images;
  if (provider.name === 'ollama') {
    const { prepareVisionImagesForOllama } = await import('./prepareVisionImage');
    visionImages = await prepareVisionImagesForOllama(images);
  }

  const rawText = await provider.analyze({
    systemPrompt: buildAnalyzeSystemPrompt(),
    userPrompt: buildAnalyzeUserPrompt(input.hint, input.figmaContext),
    images: visionImages,
  });

  let parsed: AnalyzeResult;
  try {
    parsed = analyzeResultSchema.parse(JSON.parse(extractJson(rawText)));
  } catch {
    throw new Error('AI returned invalid JSON. Try again or use a clearer screenshot.');
  }

  const blocks = sanitizeBlocks(parsed, input.desktopUrl, input.mobileUrl);

  return {
    confidence: parsed.confidence,
    blocks,
    reasoning: parsed.reasoning,
  };
}

/** Convert AI blocks to template blocks with IDs for rendering */
export function toTemplateBlocks(blocks: AiBlock[]) {
  return blocks.map((block) => {
    const def = getComponentDefinition(block.componentId);
    return {
      id: generateId(),
      componentId: block.componentId,
      componentVersion: def?.version ?? 1,
      props: block.props,
      label: block.label,
    };
  });
}
