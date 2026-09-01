import { promises as fs } from 'fs';
import path from 'path';
import type { EmailTemplateDocument, TemplateSummary } from '@/lib/schema/template';
import { emailTemplateDocumentSchema } from '@/lib/schema/validators';
import { toTemplateSummary } from '@/lib/templates/factory';
import type { TemplateRepository } from '@/lib/ports';
import { isVercelRuntime, writableRoot } from '@/lib/runtimePaths';

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
  const writeDir =
    templatesDir === DEFAULT_TEMPLATES_DIR && isVercelRuntime()
      ? path.join(writableRoot(), 'data', 'templates')
      : templatesDir;

  async function ensureWriteDir(): Promise<void> {
    await fs.mkdir(writeDir, { recursive: true });
  }

  function writePath(id: string): string {
    return path.join(writeDir, `${id}.json`);
  }

  function bundledPath(id: string): string {
    return path.join(templatesDir, `${id}.json`);
  }

  async function readJsonFiles(dir: string): Promise<string[]> {
    try {
      return (await fs.readdir(dir)).filter((file) => file.endsWith('.json'));
    } catch {
      return [];
    }
  }

  return {
    async list(): Promise<TemplateSummary[]> {
      await ensureWriteDir();
      const files = new Set([
        ...(await readJsonFiles(templatesDir)),
        ...(writeDir === templatesDir ? [] : await readJsonFiles(writeDir)),
      ]);

      const summaries: TemplateSummary[] = [];
      for (const file of files) {
        try {
          const overlay = path.join(writeDir, file);
          const bundled = path.join(templatesDir, file);
          const raw = await fs.readFile(overlay).catch(() => fs.readFile(bundled));
          const parsed = emailTemplateDocumentSchema.parse(JSON.parse(raw.toString('utf-8')));
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
      for (const candidate of [writePath(id), bundledPath(id)]) {
        try {
          const raw = await fs.readFile(candidate, 'utf-8');
          return emailTemplateDocumentSchema.parse(JSON.parse(raw));
        } catch {
          // try next location
        }
      }
      return null;
    },

    async save(document: EmailTemplateDocument): Promise<EmailTemplateDocument> {
      await ensureWriteDir();
      const validated = emailTemplateDocumentSchema.parse(document);
      await fs.writeFile(writePath(validated.id), JSON.stringify(validated, null, 2), 'utf-8');
      return validated;
    },

    async delete(id: string): Promise<boolean> {
      let removed = false;
      for (const candidate of [writePath(id), bundledPath(id)]) {
        try {
          await fs.unlink(candidate);
          removed = true;
        } catch {
          // ignore missing / read-only bundled files
        }
      }
      return removed;
    },
  };
}
