import type {
  CreateSavedComponentInput,
  SavedComponentDocument,
} from '@/lib/schema/savedComponent';
import { SAVED_COMPONENT_SCHEMA_VERSION } from '@/lib/schema/savedComponent';
import { createSavedComponentSchema, savedComponentDocumentSchema } from '@/lib/schema/validators';
import type { TemplateSummary } from '@/lib/schema/template';
import type { SavedComponentRepository, TemplateRepository } from '@/lib/ports';
import { getContainer } from '@/lib/container';
import { generateId } from '@/lib/utils/id';

export type RemoveSavedComponentResult =
  | { status: 'deleted' }
  | { status: 'not-found' }
  | { status: 'in-use'; templates: TemplateSummary[] };

export interface SavedComponentService {
  list(): Promise<SavedComponentDocument[]>;
  get(id: string): Promise<SavedComponentDocument | null>;
  create(input: CreateSavedComponentInput): Promise<SavedComponentDocument>;
  remove(id: string): Promise<RemoveSavedComponentResult>;
}

export class DuplicateSavedComponentNameError extends Error {
  constructor(name: string) {
    super(`A reusable component named "${name}" already exists`);
    this.name = 'DuplicateSavedComponentNameError';
  }
}

export function createSavedComponentService(
  repository: SavedComponentRepository,
  templateRepository: TemplateRepository
): SavedComponentService {
  return {
    async list() {
      const components = await repository.list();
      return [...components].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    },

    get(id) {
      return repository.get(id);
    },

    async create(input) {
      const parsed = createSavedComponentSchema.parse(input);
      const existing = await repository.list();
      const normalizedName = parsed.name.toLocaleLowerCase();
      if (existing.some((item) => item.name.toLocaleLowerCase() === normalizedName)) {
        throw new DuplicateSavedComponentNameError(parsed.name);
      }

      const now = new Date().toISOString();
      const document = savedComponentDocumentSchema.parse({
        ...parsed,
        description: parsed.description || undefined,
        props: structuredClone(parsed.props),
        schemaVersion: SAVED_COMPONENT_SCHEMA_VERSION,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      });
      return repository.save(document);
    },

    async remove(id) {
      const existing = await repository.get(id);
      if (!existing) return { status: 'not-found' };

      const summaries = await templateRepository.list();
      const blockingTemplates: TemplateSummary[] = [];
      for (const summary of summaries) {
        const template = await templateRepository.get(summary.id);
        if (template?.blocks.some((block) => block.sourceSavedComponentId === id)) {
          blockingTemplates.push(summary);
        }
      }

      if (blockingTemplates.length > 0) {
        return { status: 'in-use', templates: blockingTemplates };
      }

      const deleted = await repository.delete(id);
      return deleted ? { status: 'deleted' } : { status: 'not-found' };
    },
  };
}

export function getSavedComponentService(): SavedComponentService {
  const container = getContainer();
  return createSavedComponentService(
    container.savedComponentRepository,
    container.templateRepository
  );
}
