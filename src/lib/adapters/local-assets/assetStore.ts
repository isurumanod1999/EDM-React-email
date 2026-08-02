import { promises as fs } from 'fs';
import path from 'path';
import { generateId } from '@/lib/utils/id';
import type { AssetStore, AssetInput, StoredAsset } from '@/lib/ports';

/**
 * Local filesystem implementation of AssetStore (Story 1.4 / AD-2).
 *
 * Owns all direct filesystem access for uploaded assets. Objects are written
 * under public/images/uploads and referenced by the public URL path the
 * builder already uses.
 */

export const DEFAULT_UPLOAD_DIR = path.join(process.cwd(), 'public', 'images', 'uploads');
const PUBLIC_URL_PREFIX = '/images/uploads';

const EXT_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export function createLocalAssetStore(uploadDir: string = DEFAULT_UPLOAD_DIR): AssetStore {
  return {
    async put(input: AssetInput): Promise<StoredAsset> {
      await fs.mkdir(uploadDir, { recursive: true });

      const ext =
        EXT_BY_MIME[input.contentType] ??
        (input.filename ? path.extname(input.filename) || '.png' : '.png');
      const key = `${generateId()}${ext}`;

      await fs.writeFile(path.join(uploadDir, key), Buffer.from(input.data));

      return {
        key,
        url: `${PUBLIC_URL_PREFIX}/${key}`,
        contentType: input.contentType,
        byteSize: input.data.byteLength,
      };
    },

    getUrl(key: string): string {
      return `${PUBLIC_URL_PREFIX}/${key}`;
    },

    async delete(key: string): Promise<boolean> {
      try {
        await fs.unlink(path.join(uploadDir, key));
        return true;
      } catch {
        return false;
      }
    },
  };
}
