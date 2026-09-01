import { z } from 'zod';

export const aiBlockSchema = z.object({
  componentId: z.string().min(1),
  props: z.record(z.unknown()).default({}),
  label: z.string().optional(),
});

export const analyzeResultSchema = z.object({
  confidence: z.number().min(0).max(1),
  blocks: z.array(aiBlockSchema).min(1).max(6),
  reasoning: z.string().default(''),
});

export type AiBlock = z.infer<typeof aiBlockSchema>;
export type AnalyzeResult = z.infer<typeof analyzeResultSchema>;

export const analyzeRequestSchema = z.object({
  desktopUrl: z.string().min(1),
  mobileUrl: z.string().optional(),
  hint: z.string().optional(),
  figmaContext: z.string().optional(),
});
