import { generateId } from '@/lib/utils/id';
import type { TemplateBlock } from '@/lib/schema/template';
import type { ComponentDefinition, ComponentRegistryEntry } from './types';
import { componentDefinitions, componentRegistry } from './definitions';

export {
  createEmptyTemplate,
  toTemplateSummary,
  DEFAULT_TEMPLATE_META,
} from '@/lib/templates/factory';
export type { EmailTemplateMeta } from '@/lib/templates/factory';

export function getComponentDefinition(id: string): ComponentDefinition | undefined {
  return componentRegistry.get(id);
}

export function getAllComponentDefinitions(): ComponentDefinition[] {
  return componentDefinitions;
}

export function getRegistryEntries(): ComponentRegistryEntry[] {
  return componentDefinitions.map(({ component: _component, hideFromPalette: _hidden, ...entry }) => ({
    ...entry,
    defaultProps: entry.defaultProps as Record<string, unknown>,
  }));
}

export function getPaletteEntries(): ComponentRegistryEntry[] {
  return getRegistryEntries().filter((entry) => {
    const def = componentRegistry.get(entry.id);
    return !def?.hideFromPalette;
  });
}

export function getPaletteEntriesByCategory(): Record<string, ComponentRegistryEntry[]> {
  return getPaletteEntries().reduce<Record<string, ComponentRegistryEntry[]>>((acc, entry) => {
    if (!acc[entry.category]) {
      acc[entry.category] = [];
    }
    acc[entry.category].push(entry);
    return acc;
  }, {});
}

export function getRegistryEntriesByCategory(): Record<string, ComponentRegistryEntry[]> {
  return getRegistryEntries().reduce<Record<string, ComponentRegistryEntry[]>>((acc, entry) => {
    if (!acc[entry.category]) {
      acc[entry.category] = [];
    }
    acc[entry.category].push(entry);
    return acc;
  }, {});
}

export function createBlockFromComponent(componentId: string, label?: string): TemplateBlock | null {
  const definition = getComponentDefinition(componentId);
  if (!definition) {
    return null;
  }

  return {
    id: generateId(),
    componentId: definition.id,
    componentVersion: definition.version,
    props: structuredClone(definition.defaultProps) as Record<string, unknown>,
    label: label ?? definition.name,
  };
}
