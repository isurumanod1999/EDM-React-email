import { promises as fs } from 'fs';
import path from 'path';
import type { SavedComponentDocument } from '@/lib/schema/savedComponent';
import { savedComponentDocumentSchema } from '@/lib/schema/validators';
import type { SavedComponentRepository } from '@/lib/ports';
import { isVercelRuntime, writableRoot } from '@/lib/runtimePaths';

export const DEFAULT_SAVED_COMPONENTS_DIR = path.join(
  process.cwd(),
  'data',
  'saved-components'
);

export function createFilesystemSavedComponentRepository(
  componentsDir: string = DEFAULT_SAVED_COMPONENTS_DIR
): SavedComponentRepository {
  const writeDir =
    componentsDir === DEFAULT_SAVED_COMPONENTS_DIR && isVercelRuntime()
      ? path.join(writableRoot(), 'data', 'saved-components')
      : componentsDir;

  async function ensureDir(): Promise<void> {
    await fs.mkdir(writeDir, { recursive: true });
  }

  function filePath(id: string): string {
    return path.join(writeDir, `${id}.json`);
  }

  async function readFrom(id: string): Promise<string | null> {
    for (const candidate of [path.join(writeDir, `${id}.json`), path.join(componentsDir, `${id}.json`)]) {
      try {
        return await fs.readFile(candidate, 'utf-8');
      } catch {
        // try next
      }
    }
    return null;
  }

  return {
    async list() {
      await ensureDir();
      const names = new Set<string>();
      for (const dir of writeDir === componentsDir ? [componentsDir] : [componentsDir, writeDir]) {
        try {
          for (const file of await fs.readdir(dir)) {
            if (file.endsWith('.json')) names.add(file);
          }
        } catch {
          // missing dir
        }
      }
      const files = [...names];
      const components: SavedComponentDocument[] = [];

      for (const file of files) {
        try {
          const raw =
            (await readFrom(file.replace(/\.json$/, ''))) ??
            (await fs.readFile(path.join(componentsDir, file), 'utf-8'));
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
      const raw = await readFrom(id);
      if (!raw) return null;
      try {
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
