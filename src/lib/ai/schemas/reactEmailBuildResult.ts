import { z } from 'zod';

const cssStyleSchema = z.record(z.union([z.string(), z.number(), z.undefined()])).optional();

export const reactEmailNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('Section'),
      style: cssStyleSchema,
      children: z.array(reactEmailNodeSchema),
    }),
    z.object({
      type: z.literal('Container'),
      style: cssStyleSchema,
      children: z.array(reactEmailNodeSchema),
    }),
    z.object({
      type: z.literal('Row'),
      style: cssStyleSchema,
      children: z.array(reactEmailNodeSchema),
    }),
    z.object({
      type: z.literal('Column'),
      style: cssStyleSchema,
      children: z.array(reactEmailNodeSchema),
    }),
    z.object({
      type: z.literal('Text'),
      content: z.string(),
      style: cssStyleSchema,
    }),
    z.object({
      type: z.literal('Heading'),
      content: z.string(),
      as: z.enum(['h1', 'h2', 'h3']).optional(),
      style: cssStyleSchema,
    }),
    z.object({
      type: z.literal('Img'),
      src: z.string(),
      mobileSrc: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      alt: z.string().optional(),
      className: z.string().optional(),
    }),
    z.object({
      type: z.literal('Link'),
      href: z.string(),
      children: z.array(reactEmailNodeSchema),
    }),
    z.object({
      type: z.literal('Button'),
      href: z.string(),
      label: z.string(),
      style: cssStyleSchema,
      containerStyle: cssStyleSchema,
    }),
    z.object({
      type: z.literal('Hr'),
      style: cssStyleSchema,
    }),
  ])
);

export const reactEmailBuildResultSchema = z.object({
  confidence: z.number().min(0).max(1),
  tree: reactEmailNodeSchema,
  reasoning: z.string().default(''),
  warnings: z.array(z.string()).optional(),
});

export type ReactEmailBuildResult = z.infer<typeof reactEmailBuildResultSchema>;

export const buildReactEmailRequestSchema = z.object({
  desktopUrl: z.string().min(1),
  mobileUrl: z.string().optional(),
  desktopNode: z.unknown(),
  mobileNode: z.unknown().optional(),
  nodeName: z.string(),
  fileName: z.string().optional(),
  figmaContext: z.string().optional(),
  hint: z.string().optional(),
});
