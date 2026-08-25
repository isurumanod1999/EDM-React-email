export const SCHEMA_VERSION = 1 as const;

export type TemplateCategory =
  | 'promotional'
  | 'newsletter'
  | 'transactional'
  | 'product-showcase'
  | 'layout';

export type ComponentCategory =
  | 'layout'
  | 'promotional'
  | 'newsletter'
  | 'transactional'
  | 'product-showcase';

export interface EmailTemplateMeta {
  previewText: string;
  backgroundColor: string;
  containerWidth: number;
}

export interface TemplateBlock {
  id: string;
  componentId: string;
  componentVersion: number;
  props: Record<string, unknown>;
  label?: string;
  /** Provenance for placements cloned from the shared reusable-component library. */
  sourceSavedComponentId?: string;
}

export interface EmailTemplateDocument {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  tags?: string[];
  meta: EmailTemplateMeta;
  blocks: TemplateBlock[];
  createdAt: string;
  updatedAt: string;
  duplicatedFrom?: string;
}

export interface TemplateSummary {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  blockCount: number;
  updatedAt: string;
}

export const DEFAULT_TEMPLATE_META: EmailTemplateMeta = {
  previewText: 'Preview your email',
  backgroundColor: '#f4f4f4',
  containerWidth: 600,
};
