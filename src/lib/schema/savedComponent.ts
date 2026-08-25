import type { ComponentCategory } from './template';

export const SAVED_COMPONENT_SCHEMA_VERSION = 1 as const;

export interface SavedComponentDocument {
  schemaVersion: typeof SAVED_COMPONENT_SCHEMA_VERSION;
  id: string;
  name: string;
  description?: string;
  category: ComponentCategory;
  componentId: string;
  componentVersion: number;
  props: Record<string, unknown>;
  label?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateSavedComponentInput = Pick<
  SavedComponentDocument,
  'name' | 'description' | 'category' | 'componentId' | 'componentVersion' | 'props' | 'label'
>;
