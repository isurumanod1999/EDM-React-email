import { z } from 'zod';
import { SCHEMA_VERSION } from './template';

export const templateCategorySchema = z.enum([
  'promotional',
  'newsletter',
  'transactional',
  'product-showcase',
  'layout',
]);

export const emailTemplateMetaSchema = z.object({
  previewText: z.string().min(1),
  backgroundColor: z.string().min(1),
  containerWidth: z.number().int().positive().default(600),
});

export const templateBlockSchema = z.object({
  id: z.string().min(1),
  componentId: z.string().min(1),
  componentVersion: z.number().int().positive(),
  props: z.record(z.unknown()),
  label: z.string().optional(),
});

export const emailTemplateDocumentSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: templateCategorySchema,
  tags: z.array(z.string()).optional(),
  meta: emailTemplateMetaSchema,
  blocks: z.array(templateBlockSchema),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  duplicatedFrom: z.string().optional(),
});

export const renderTemplateRequestSchema = z.object({
  meta: emailTemplateMetaSchema.optional(),
  blocks: z.array(templateBlockSchema).min(1),
  /** Editor-only: inject per-node selection attributes + the click bridge. */
  editable: z.boolean().optional(),
});

export const exportTemplateRequestSchema = z.object({
  name: z.string().min(1).optional(),
  meta: emailTemplateMetaSchema.optional(),
  blocks: z.array(templateBlockSchema).optional(),
  templateId: z.string().min(1).optional(),
});

export const sendTestRequestSchema = z.object({
  /** One or more recipient email addresses. */
  to: z.array(z.string().email()).min(1, 'Add at least one recipient'),
  subject: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  meta: emailTemplateMetaSchema.optional(),
  blocks: z.array(templateBlockSchema).optional(),
  templateId: z.string().min(1).optional(),
});

export type RenderTemplateRequest = z.infer<typeof renderTemplateRequestSchema>;
export type ExportTemplateRequest = z.infer<typeof exportTemplateRequestSchema>;
export type SendTestRequest = z.infer<typeof sendTestRequestSchema>;
export type EmailTemplateDocumentInput = z.infer<typeof emailTemplateDocumentSchema>;
