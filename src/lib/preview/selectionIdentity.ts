/**
 * Opaque preview selection paths.
 * Figma AST: dotted indexes ("0.1.2").
 * Built-in fields: "field:{registryFieldKey}".
 */

export const FIELD_PATH_PREFIX = 'field:';

export function fieldPath(key: string): string {
  return `${FIELD_PATH_PREFIX}${key}`;
}

export function parseFieldPath(nodePath: string | null | undefined): string | null {
  if (!nodePath?.startsWith(FIELD_PATH_PREFIX)) return null;
  const key = nodePath.slice(FIELD_PATH_PREFIX.length);
  return key.length > 0 ? key : null;
}

export function editorSelectAttrs(
  editable: boolean | undefined,
  blockId: string | undefined,
  nodePath: string
): Record<string, string> {
  if (!editable || !blockId) return {};
  return {
    'data-block-id': blockId,
    'data-node-path': nodePath,
  };
}
