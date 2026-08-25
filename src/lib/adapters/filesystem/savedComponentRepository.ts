import { promises as fs } from 'fs';
import path from 'path';
import type { SavedComponentDocument } from '@/lib/schema/savedComponent';
import { savedComponentDocumentSchema } from '@/lib/schema/validators';
import type { SavedComponentRepository } from '@/lib/ports';

export const DEFAULT_SAVED_COMPONENTS_DIR = path.join(
  process.cwd(),
  'data',
  'saved-components'
);

export function createFilesystemSavedComponentRepository(
  componentsDir: string = DEFAULT_SAVED_COMPONENTS_DIR
): SavedComponentRepository {
  async function ensureDir(): Promise<void> {
    await fs.mkdir(componentsDir, { recursive: true });
  }

  function filePath(id: string): string {
    return path.join(componentsDir, `${id}.json`);
  }

  return {
    async list() {
      await ensureDir();
      const files = (await fs.readdir(componentsDir)).filter((file) => file.endsWith('.json'));
      const components: SavedComponentDocument[] = [];

      for (const file of files) {
        try {
          const raw = await fs.readFile(path.join(componentsDir, file), 'utf-8');
          components.push(savedComponentDocumentSchema.parse(JSON.parse(raw)));
        } catch {
          // Invalid records are skipped consistently with TemplateRepository.
        }
      }

      return components.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    },

    async get(id) {
      try {
        const raw = await fs.readFile(filePath(id), 'utf-8');
        return savedComponentDocumentSchema.parse(JSON.parse(raw));
      } catch {
        return null;
      }
    },

    async save(document) {
      await ensureDir();
      const validated = savedComponentDocumentSchema.parse(document);
      await fs.writeFile(filePath(validated.id), JSON.stringify(validated, null, 2), 'utf-8');
      return validated;
    },

    async delete(id) {
      try {
        await fs.unlink(filePath(id));
        return true;
      } catch {
        return false;
      }
    },
  };
}
