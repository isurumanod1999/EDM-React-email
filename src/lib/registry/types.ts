import type React from 'react';
import type { ComponentCategory } from '@/lib/schema/template';

export type FieldType =
  | 'text'
  | 'richtext'
  | 'url'
  | 'image'
  | 'color'
  | 'number'
  | 'boolean'
  | 'select'
  | 'json';

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  defaultValue?: unknown;
  options?: { label: string; value: string }[];
  group?: string;
  advanced?: boolean;
  placeholder?: string;
  helpText?: string;
}

export interface ComponentDefinition<TProps = Record<string, unknown>> {
  id: string;
  name: string;
  category: ComponentCategory;
  description: string;
  version: number;
  /** When true, omitted from the builder component palette (import-only blocks). */
  hideFromPalette?: boolean;
  component: React.ComponentType<any>;
  defaultProps: TProps;
  fields: FieldDefinition[];
}

/** Palette-safe metadata returned by GET /api/registry (no React components). */
export interface ComponentRegistryEntry {
  id: string;
  name: string;
  category: ComponentCategory;
  description: string;
  version: number;
  defaultProps: Record<string, unknown>;
  fields: FieldDefinition[];
}
