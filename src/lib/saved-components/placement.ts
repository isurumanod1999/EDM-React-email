import type { SavedComponentDocument } from '@/lib/schema/savedComponent';
import type { TemplateBlock } from '@/lib/schema/template';
import { generateId } from '@/lib/utils/id';

/** Insert a library snapshot onto a canvas: fresh block id, cloned props, provenance. */
export function createBlockFromSavedComponent(
  saved: SavedComponentDocument,
  blockId: string = generateId()
): TemplateBlock {
  return {
    id: blockId,
    componentId: saved.componentId,
    componentVersion: saved.componentVersion,
    props: structuredClone(saved.props),
    label: saved.name,
    sourceSavedComponentId: saved.id,
  };
}
