import { getAllComponentDefinitions } from '@/lib/registry';

export function buildRegistryCatalog(): string {
  const definitions = getAllComponentDefinitions();

  return definitions
    .map((def) => {
      const fields = def.fields
        .map((f) => `    - ${f.key} (${f.type}${f.required ? ', required' : ''}): ${f.label}`)
        .join('\n');

      return `- id: "${def.id}"
  name: ${def.name}
  category: ${def.category}
  description: ${def.description}
  fields:
${fields}
  defaultProps sample: ${JSON.stringify(def.defaultProps, null, 0).slice(0, 200)}...`;
    })
    .join('\n\n');
}

export const VALID_COMPONENT_IDS = new Set(
  getAllComponentDefinitions().map((d) => d.id)
);
