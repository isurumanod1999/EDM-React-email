import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createFilesystemSavedComponentRepository } from '@/lib/adapters/filesystem/savedComponentRepository';
import type { SavedComponentDocument } from '@/lib/schema/savedComponent';

describe('FilesystemSavedComponentRepository', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('persists a valid snapshot and skips invalid files', async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'saved-components-'));
    const repository = createFilesystemSavedComponentRepository(dir);
    const document: SavedComponentDocument = {
      schemaVersion: 1,
      id: 'saved-valid',
      name: 'Header',
      category: 'layout',
      componentId: 'header',
      componentVersion: 1,
      props: { logoUrl: 'https://example.com/logo.png' },
      createdAt: '2026-08-24T00:00:00.000Z',
      updatedAt: '2026-08-24T00:00:00.000Z',
    };

    await repository.save(document);
    await writeFile(path.join(dir, 'broken.json'), '{not-json', 'utf-8');

    expect(await repository.get('saved-valid')).toEqual(document);
    expect(await repository.list()).toEqual([document]);
  });
});
