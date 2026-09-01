import { describe, it, expect, beforeEach } from 'vitest';
import { createTemplateService } from './service';
import type { TemplateRepository } from '@/lib/ports';
import type { EmailTemplateDocument, TemplateSummary } from '@/lib/schema/template';
import { toTemplateSummary } from '@/lib/templates/factory';

function createInMemoryRepository(): TemplateRepository {
  const store = new Map<string, EmailTemplateDocument>();
  return {
    async list(): Promise<TemplateSummary[]> {
      return Array.from(store.values()).map(toTemplateSummary);
    },
    async get(id) {
      return store.get(id) ?? null;
    },
    async save(document) {
      store.set(document.id, document);
      return document;
    },
    async delete(id) {
      return store.delete(id);
    },
  };
}

describe('TemplateService', () => {
  let service: ReturnType<typeof createTemplateService>;

  beforeEach(() => {
    service = createTemplateService(createInMemoryRepository());
  });

  it('creates a template from defaults with a generated id and timestamps', async () => {
    const created = await service.create({ useDefaults: true, name: 'Welcome' });

    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Welcome');
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBeTruthy();
    expect(created.blocks).toEqual([]);
  });

  it('lists created templates as summaries', async () => {
    await service.create({ useDefaults: true, name: 'A' });
    await service.create({ useDefaults: true, name: 'B' });

    const list = await service.list();
    expect(list).toHaveLength(2);
    expect(list.map((t) => t.name).sort()).toEqual(['A', 'B']);
  });

  it('updates an existing template and refreshes updatedAt', async () => {
    const created = await service.create({ useDefaults: true, name: 'Original' });

    const updated = await service.update(created.id, { name: 'Renamed' });
    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('Renamed');
    expect(updated?.id).toBe(created.id);
    expect(updated?.createdAt).toBe(created.createdAt);
  });

  it('returns null when updating a missing template', async () => {
    const result = await service.update('does-not-exist', { name: 'x' });
    expect(result).toBeNull();
  });

  it('duplicates a template with a new id and copied blocks', async () => {
    const created = await service.create({ useDefaults: true, name: 'Source' });

    const copy = await service.duplicate(created.id);
    expect(copy).not.toBeNull();
    expect(copy?.id).not.toBe(created.id);
    expect(copy?.name).toBe('Source (Copy)');
    expect(copy?.duplicatedFrom).toBe(created.id);
  });

  it('removes a template', async () => {
    const created = await service.create({ useDefaults: true, name: 'ToDelete' });
    expect(await service.remove(created.id)).toBe(true);
    expect(await service.get(created.id)).toBeNull();
  });
});
