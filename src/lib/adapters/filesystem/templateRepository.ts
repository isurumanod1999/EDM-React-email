import { promises as fs } from 'fs';
import path from 'path';
import type { EmailTemplateDocument, TemplateSummary } from '@/lib/schema/template';
import { emailTemplateDocumentSchema } from '@/lib/schema/validators';
import { toTemplateSummary } from '@/lib/templates/factory';
import type { TemplateRepository } from '@/lib/ports';

/**
 * Filesystem implementation of TemplateRepository (Story 1.3 / AD-2).
 *
 * Owns all direct filesystem access for templates. Behavior mirrors the
 * original fileStorage: documents are validated on read/write and invalid
 * files are skipped when listing.
 */

export const DEFAULT_TEMPLATES_DIR = path.join(process.cwd(), 'data', 'templates');

export function createFilesystemTemplateRepository(
  templatesDir: string = DEFAULT_TEMPLATES_DIR
): TemplateRepository {
  async function ensureDir(): Promise<void> {
    await fs.mkdir(templatesDir, { recursive: true });
  }

  function filePath(id: string): string {
    return path.join(templatesDir, `${id}.json`);
  }

  return {
    async list(): Promise<TemplateSummary[]> {
      await ensureDir();
      const files = await fs.readdir(templatesDir);
      const jsonFiles = files.filter((file) => file.endsWith('.json'));

      const summaries: TemplateSummary[] = [];
      for (const file of jsonFiles) {
        try {
          const raw = await fs.readFile(path.join(templatesDir, file), 'utf-8');
          const parsed = emailTemplateDocumentSchema.parse(JSON.parse(raw));
          summaries.push(toTemplateSummary(parsed));
        } catch {
          // Skip invalid template files
        }
      }

      return summaries.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    },

    async get(id: string): Promise<EmailTemplateDocument | null> {
      try {
        const raw = await fs.readFile(filePath(id), 'utf-8');
        return emailTemplateDocumentSchema.parse(JSON.parse(raw));
      } catch {
        return null;
      }
    },

    async save(document: EmailTemplateDocument): Promise<EmailTemplateDocument> {
      await ensureDir();
      const validated = emailTemplateDocumentSchema.parse(document);
      await fs.writeFile(filePath(validated.id), JSON.stringify(validated, null, 2), 'utf-8');
      return validated;
    },

    async delete(id: string): Promise<boolean> {
      try {
        await fs.unlink(filePath(id));
        return true;
      } catch {
        return false;
      }
    },
  };
}
