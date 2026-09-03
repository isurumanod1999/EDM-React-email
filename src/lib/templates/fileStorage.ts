import type { EmailTemplateDocument, TemplateSummary } from '@/lib/schema/template';
import { emailTemplateDocumentSchema } from '@/lib/schema/validators';
import { generateId } from '@/lib/utils/id';
import { getContainer } from '@/lib/container';
import { DEFAULT_TEMPLATES_DIR } from '@/lib/adapters/filesystem/templateRepository';

/**
 * Backward-compatible template storage API.
 *
 * These functions resolve persistence through the application container so
 * legacy callers use the same configured repository as the template service.
 * Create/update/duplicate compose the repository's primitives and will move
 * into TemplateService in Story 1.6.
 */

export async function listTemplates(): Promise<TemplateSummary[]> {
  return getContainer().templateRepository.list();
}

export async function getTemplate(id: string): Promise<EmailTemplateDocument | null> {
  return getContainer().templateRepository.get(id);
}

export async function saveTemplate(
  template: EmailTemplateDocument
): Promise<EmailTemplateDocument> {
  return getContainer().templateRepository.save(template);
}

export async function createTemplate(
  template: Omit<EmailTemplateDocument, 'createdAt' | 'updatedAt'> & {
    createdAt?: string;
    updatedAt?: string;
  }
): Promise<EmailTemplateDocument> {
  const now = new Date().toISOString();
  const doc: EmailTemplateDocument = emailTemplateDocumentSchema.parse({
    ...template,
    createdAt: template.createdAt ?? now,
    updatedAt: template.updatedAt ?? now,
  });
  return getContainer().templateRepository.save(doc);
}

export async function updateTemplate(
  id: string,
  updates: Partial<Omit<EmailTemplateDocument, 'id' | 'createdAt'>>
): Promise<EmailTemplateDocument | null> {
  const repository = getContainer().templateRepository;
  const existing = await repository.get(id);
  if (!existing) {
    return null;
  }

  const updated: EmailTemplateDocument = emailTemplateDocumentSchema.parse({
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  });

  return repository.save(updated);
}

export async function deleteTemplate(id: string): Promise<boolean> {
  return getContainer().templateRepository.delete(id);
}

export async function duplicateTemplate(id: string): Promise<EmailTemplateDocument | null> {
  const repository = getContainer().templateRepository;
  const existing = await repository.get(id);
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const duplicate: EmailTemplateDocument = emailTemplateDocumentSchema.parse({
    ...existing,
    id: generateId(),
    name: `${existing.name} (Copy)`,
    duplicatedFrom: existing.id,
    blocks: existing.blocks.map((block) => ({
      ...block,
      id: generateId(),
    })),
    createdAt: now,
    updatedAt: now,
  });

  return repository.save(duplicate);
}

export const TEMPLATES_DIR = DEFAULT_TEMPLATES_DIR;
