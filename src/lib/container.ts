import { config } from '@/lib/config';
import type { TemplateRepository, AssetStore } from '@/lib/ports';
import { createFilesystemTemplateRepository } from '@/lib/adapters/filesystem/templateRepository';
import { createLocalAssetStore } from '@/lib/adapters/local-assets/assetStore';

/**
 * Composition root (Story 1.5 / AD-3).
 *
 * The single place adapters are chosen from config. This phase binds only the
 * filesystem/local adapters; postgres/s3 are accepted by config validation but
 * rejected here with a clear message until their adapters land (Epics F1/F2).
 */

export interface AppContainer {
  templateRepository: TemplateRepository;
  assetStore: AssetStore;
}

function resolveTemplateRepository(): TemplateRepository {
  switch (config.storageDriver) {
    case 'filesystem':
      return createFilesystemTemplateRepository();
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
      assetStore: resolveAssetStore(),
    };
  }
  return instance;
}
