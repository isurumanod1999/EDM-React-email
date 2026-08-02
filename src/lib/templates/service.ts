import type { EmailTemplateDocument, TemplateSummary } from '@/lib/schema/template';
import { emailTemplateDocumentSchema } from '@/lib/schema/validators';
import { createEmptyTemplate } from '@/lib/templates/factory';
import { generateId } from '@/lib/utils/id';
import { getContainer } from '@/lib/container';
import type { TemplateRepository } from '@/lib/ports';

/**
 * Application service for templates (Story 1.6).
 *
 * Owns create/update/duplicate semantics and timestamp stamping over the
 * TemplateRepository port, so route handlers stay thin and never touch storage
 * directly (AD-1).
 */

type CreateInput = Record<string, unknown>;

export interface TemplateService {
  list(): Promise<TemplateSummary[]>;
  get(id: string): Promise<EmailTemplateDocument | null>;
  create(input: CreateInput): Promise<EmailTemplateDocument>;
  update(id: string, updates: Record<string, unknown>): Promise<EmailTemplateDocument | null>;
  remove(id: string): Promise<boolean>;
  duplicate(id: string): Promise<EmailTemplateDocument | null>;
}

export function createTemplateService(repository: TemplateRepository): TemplateService {
  async function persistNew(
    input: Omit<EmailTemplateDocument, 'createdAt' | 'updatedAt'> & {
      createdAt?: string;
      updatedAt?: string;
    }
  ): Promise<EmailTemplateDocument> {
    const now = new Date().toISOString();
    const doc = emailTemplateDocumentSchema.parse({
      ...input,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    });
    return repository.save(doc);
  }

  return {
    list() {
      return repository.list();
    },

    get(id) {
      return repository.get(id);
    },

    create(input) {
      if (input.useDefaults === true || !input.id) {
        const template = createEmptyTemplate(
          (input.name as string) ?? 'Untitled Template',
          (input.category as EmailTemplateDocument['category']) ?? 'newsletter'
        );

        if (input.description) {
          template.description = input.description as string;
        }

        if (Array.isArray(input.blocks)) {
          template.blocks = input.blocks as EmailTemplateDocument['blocks'];
        }

        return persistNew(template);
      }

      const validated = emailTemplateDocumentSchema.parse(input);
      return persistNew(validated);
    },

    async update(id, updates) {
      const existing = await repository.get(id);
      if (!existing) {
        return null;
      }

      const merged = emailTemplateDocumentSchema.parse({
        ...existing,
        ...updates,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      });

      return repository.save(merged);
    },

    remove(id) {
      return repository.delete(id);
    },

    async duplicate(id) {
      const existing = await repository.get(id);
      if (!existing) {
        return null;
      }

      const now = new Date().toISOString();
      const duplicate = emailTemplateDocumentSchema.parse({
        ...existing,
        id: generateId(),
        name: `${existing.name} (Copy)`,
        duplicatedFrom: existing.id,
        blocks: existing.blocks.map((block) => ({ ...block, id: generateId() })),
        createdAt: now,
        updatedAt: now,
      });

      return repository.save(duplicate);
    },
  };
}

/** Convenience accessor bound to the application container. */
export function getTemplateService(): TemplateService {
  return createTemplateService(getContainer().templateRepository);
}
