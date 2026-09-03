import { del, get, list, put } from '@vercel/blob';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlobTemplateRepository } from '@/lib/adapters/blob/templateRepository';
import type { TemplateRepository } from '@/lib/ports';
import type { EmailTemplateDocument } from '@/lib/schema/template';
import { toTemplateSummary } from '@/lib/templates/factory';

vi.mock('@vercel/blob', () => ({
  del: vi.fn(),
  get: vi.fn(),
  list: vi.fn(),
  put: vi.fn(),
}));

function template(
  id: string,
  name: string,
  updatedAt = '2026-09-01T00:00:00.000Z'
): EmailTemplateDocument {
  return {
    schemaVersion: 1,
    id,
    name,
    category: 'newsletter',
    meta: {
      previewText: 'Preview',
      backgroundColor: '#ffffff',
      containerWidth: 600,
    },
    blocks: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt,
  };
}

function blobResult(body: string, pathname: string) {
  return {
    statusCode: 200 as const,
    stream: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body));
        controller.close();
      },
    }),
    headers: new Headers(),
    blob: {
      url: `https://example.com/${pathname}`,
      downloadUrl: `https://example.com/${pathname}?download=1`,
      pathname,
      contentDisposition: 'attachment',
      contentType: 'application/json',
      cacheControl: 'public, max-age=60',
      uploadedAt: new Date('2026-09-01T00:00:00.000Z'),
      etag: 'etag',
      size: body.length,
    },
  };
}

function listedBlob(pathname: string) {
  return {
    url: `https://example.com/${pathname}`,
    downloadUrl: `https://example.com/${pathname}?download=1`,
    pathname,
    size: 1,
    uploadedAt: new Date('2026-09-01T00:00:00.000Z'),
    etag: 'etag',
  };
}

describe('BlobTemplateRepository', () => {
  let fallback: TemplateRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    fallback = {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      delete: vi.fn(),
    };
    vi.mocked(get).mockResolvedValue(null);
    vi.mocked(list).mockResolvedValue({ blobs: [], hasMore: false });
    vi.mocked(del).mockResolvedValue();
    vi.mocked(put).mockResolvedValue({} as never);
  });

  it('saves validated templates as private JSON and clears tombstones', async () => {
    const repository = createBlobTemplateRepository(fallback);
    const document = template('new-template', 'New template');

    await expect(repository.save(document)).resolves.toEqual(document);
    expect(put).toHaveBeenCalledWith(
      'templates/new-template.json',
      JSON.stringify(document, null, 2),
      {
        access: 'private',
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: 'application/json',
      }
    );
    expect(del).toHaveBeenCalledWith('templates/.tombstones/new-template');
  });

  it('reads Blob first without CDN caching and falls back to bundled templates', async () => {
    const bundled = template('seed', 'Bundled');
    vi.mocked(fallback.get).mockResolvedValue(bundled);
    const repository = createBlobTemplateRepository(fallback);

    await expect(repository.get('seed')).resolves.toEqual(bundled);
    expect(get).toHaveBeenNthCalledWith(1, 'templates/.tombstones/seed', {
      access: 'private',
      useCache: false,
    });
    expect(get).toHaveBeenNthCalledWith(2, 'templates/seed.json', {
      access: 'private',
      useCache: false,
    });
    expect(fallback.get).toHaveBeenCalledWith('seed');
  });

  it('merges Blob and bundled templates, honoring overrides and tombstones', async () => {
    const bundledOverride = template('override', 'Bundled override');
    const bundledDeleted = template('deleted', 'Bundled deleted');
    const blobOverride = template('override', 'Blob override', '2026-09-03T00:00:00.000Z');
    const blobOnly = template('blob-only', 'Blob only', '2026-09-02T00:00:00.000Z');
    vi.mocked(fallback.list).mockResolvedValue([
      toTemplateSummary(bundledOverride),
      toTemplateSummary(bundledDeleted),
    ]);
    vi.mocked(list).mockResolvedValue({
      blobs: [
        listedBlob('templates/override.json'),
        listedBlob('templates/blob-only.json'),
        listedBlob('templates/invalid.json'),
        listedBlob('templates/.tombstones/deleted'),
      ],
      hasMore: false,
    });
    vi.mocked(get).mockImplementation(async (pathname) => {
      if (pathname === 'templates/override.json') {
        return blobResult(JSON.stringify(blobOverride), pathname) as never;
      }
      if (pathname === 'templates/blob-only.json') {
        return blobResult(JSON.stringify(blobOnly), pathname) as never;
      }
      if (pathname === 'templates/invalid.json') {
        return blobResult('{invalid-json', pathname) as never;
      }
      return null;
    });

    const repository = createBlobTemplateRepository(fallback);

    await expect(repository.list()).resolves.toEqual([
      toTemplateSummary(blobOverride),
      toTemplateSummary(blobOnly),
    ]);
  });

  it('tombstones bundled templates when deleting and clears the Blob copy', async () => {
    const bundled = template('seed', 'Bundled');
    vi.mocked(fallback.get).mockResolvedValue(bundled);
    const repository = createBlobTemplateRepository(fallback);

    await expect(repository.delete('seed')).resolves.toBe(true);
    expect(del).toHaveBeenCalledWith('templates/seed.json');
    expect(put).toHaveBeenCalledWith('templates/.tombstones/seed', '', {
      access: 'private',
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: 'application/octet-stream',
    });
  });

  it('rejects invalid documents before writing', async () => {
    const repository = createBlobTemplateRepository(fallback);

    await expect(
      repository.save({ ...template('invalid', 'Invalid'), name: '' })
    ).rejects.toThrow();
    expect(put).not.toHaveBeenCalled();
  });
});
