import { config } from '@/lib/config';
import type { TemplateRepository, SavedComponentRepository, AssetStore } from '@/lib/ports';
import { createBlobTemplateRepository } from '@/lib/adapters/blob/templateRepository';
import { createFilesystemTemplateRepository } from '@/lib/adapters/filesystem/templateRepository';
import { createFilesystemSavedComponentRepository } from '@/lib/adapters/filesystem/savedComponentRepository';
import { createLocalAssetStore } from '@/lib/adapters/local-assets/assetStore';

/**
 * Composition root (Story 1.5 / AD-3).
 *
 * The single place adapters are chosen from config. Vercel Blob is selected
 * automatically when its credentials are present; local development continues
 * to use filesystem storage without configuration.
 */

export interface AppContainer {
  templateRepository: TemplateRepository;
  savedComponentRepository: SavedComponentRepository;
  assetStore: AssetStore;
}

function resolveTemplateRepository(): TemplateRepository {
  switch (config.storageDriver) {
    case 'filesystem': {
      const filesystemRepository = createFilesystemTemplateRepository();
      return config.blob.enabled
        ? createBlobTemplateRepository(filesystemRepository)
        : filesystemRepository;
    }
    case 'postgres':
      throw new Error(
        "STORAGE_DRIVER 'postgres' is not available in this phase. Use 'filesystem'."
      );
    default:
      throw new Error(`Unsupported STORAGE_DRIVER: ${config.storageDriver as string}`);
  }
}

function resolveAssetStore(): AssetStore {
  switch (config.assetDriver) {
    case 'local':
      return createLocalAssetStore();
    case 's3':
      throw new Error("ASSET_DRIVER 's3' is not available in this phase. Use 'local'.");
    default:
      throw new Error(`Unsupported ASSET_DRIVER: ${config.assetDriver as string}`);
  }
}

let instance: AppContainer | null = null;

/** Memoized application container; builds adapters on first access. */
export function getContainer(): AppContainer {
  if (!instance) {
    instance = {
      templateRepository: resolveTemplateRepository(),
      savedComponentRepository: createFilesystemSavedComponentRepository(),
      assetStore: resolveAssetStore(),
    };
  }
  return instance;
}
