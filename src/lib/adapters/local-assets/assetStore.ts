import { promises as fs } from 'fs';
import path from 'path';
import { generateId } from '@/lib/utils/id';
import type { AssetStore, AssetInput, StoredAsset } from '@/lib/ports';
import { bundledUploadDirectory, uploadDirectory } from '@/lib/runtimePaths';

/**
 * Local filesystem implementation of AssetStore (Story 1.4 / AD-2).
 *
 * Owns all direct filesystem access for uploaded assets. Objects are written
 * under public/images/uploads and referenced by the public URL path the
 * builder already uses.
 */

export const DEFAULT_UPLOAD_DIR = uploadDirectory();
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

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function readUploadedAsset(
  filename: string
): Promise<{ data: Uint8Array; contentType: string } | null> {
  for (const dir of [uploadDirectory(), bundledUploadDirectory()]) {
    try {
      const data = new Uint8Array(await fs.readFile(path.join(dir, filename)));
      const contentType = MIME_BY_EXT[path.extname(filename).toLowerCase()] ?? 'application/octet-stream';
      return { data, contentType };
    } catch {
      // try next directory
    }
  }
  return null;
}
