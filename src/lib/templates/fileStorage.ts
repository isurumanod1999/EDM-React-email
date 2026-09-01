import type { EmailTemplateDocument, TemplateSummary } from '@/lib/schema/template';
import { emailTemplateDocumentSchema } from '@/lib/schema/validators';
import { generateId } from '@/lib/utils/id';
import {
  createFilesystemTemplateRepository,
  DEFAULT_TEMPLATES_DIR,
} from '@/lib/adapters/filesystem/templateRepository';

/**
 * Backward-compatible template storage API.
 *
 * Filesystem access now lives in the FilesystemTemplateRepository adapter
 * (Story 1.3). These functions delegate to it so existing callers keep working
 * unchanged; create/update/duplicate compose the repository's primitives and
 * will move into TemplateService in Story 1.6.
 */

const repository = createFilesystemTemplateRepository();

export async function listTemplates(): Promise<TemplateSummary[]> {
  return repository.list();
}

export async function getTemplate(id: string): Promise<EmailTemplateDocument | null> {
  return repository.get(id);
}

export async function saveTemplate(
  template: EmailTemplateDocument
): Promise<EmailTemplateDocument> {
  return repository.save(template);
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
  return repository.save(doc);
}

export async function updateTemplate(
  id: string,
  updates: Partial<Omit<EmailTemplateDocument, 'id' | 'createdAt'>>
): Promise<EmailTemplateDocument | null> {
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
  return repository.delete(id);
}

export async function duplicateTemplate(id: string): Promise<EmailTemplateDocument | null> {
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
