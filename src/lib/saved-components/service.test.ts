import { beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import {
  createSavedComponentService,
  DuplicateSavedComponentNameError,
} from '@/lib/saved-components/service';
import type { SavedComponentRepository, TemplateRepository } from '@/lib/ports';
import type { SavedComponentDocument } from '@/lib/schema/savedComponent';
import type { EmailTemplateDocument, TemplateSummary } from '@/lib/schema/template';
import { toTemplateSummary } from '@/lib/templates/factory';

function createSavedRepository(): SavedComponentRepository {
  const store = new Map<string, SavedComponentDocument>();
  return {
    async list() {
      return [...store.values()];
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

function createTemplateRepository(
  documents: EmailTemplateDocument[] = []
): TemplateRepository {
  const store = new Map(documents.map((document) => [document.id, document]));
  return {
    async list(): Promise<TemplateSummary[]> {
      return [...store.values()].map(toTemplateSummary);
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

function templateWithReusableBlock(
  sourceSavedComponentId: string
): EmailTemplateDocument {
  return {
    schemaVersion: 1,
    id: 'template-1',
    name: 'Campaign',
    category: 'promotional',
    meta: {
      previewText: 'Preview',
      backgroundColor: '#fff',
      containerWidth: 600,
    },
    blocks: [
      {
        id: 'block-1',
        componentId: 'figma-react-email',
        componentVersion: 1,
        props: {},
        sourceSavedComponentId,
      },
    ],
    createdAt: '2026-08-24T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
  };
}

describe('SavedComponentService', () => {
  let repository: SavedComponentRepository;

  beforeEach(() => {
    repository = createSavedRepository();
  });

  it('creates an independent reusable snapshot', async () => {
    const service = createSavedComponentService(repository, createTemplateRepository());
    const props = { tree: { type: 'Text', content: 'Original' } };
    const created = await service.create({
      name: 'Pre-header',
      description: 'Shared campaign pre-header',
      category: 'layout',
      componentId: 'figma-react-email',
      componentVersion: 1,
      props,
    });

    (props.tree as { content: string }).content = 'Changed';

    expect(created.id).toBeTruthy();
    expect(created.schemaVersion).toBe(1);
    expect(created.name).toBe('Pre-header');
    expect((created.props.tree as { content: string }).content).toBe('Original');
  });

  it('rejects duplicate names without case sensitivity', async () => {
    const service = createSavedComponentService(repository, createTemplateRepository());
    const input = {
      name: 'Header',
      category: 'layout' as const,
      componentId: 'header',
      componentVersion: 1,
      props: {},
    };

    await service.create(input);
    await expect(service.create({ ...input, name: 'header' })).rejects.toBeInstanceOf(
      DuplicateSavedComponentNameError
    );
  });

  it('blocks deletion while a saved template uses the component', async () => {
    const createService = createSavedComponentService(repository, createTemplateRepository());
    const component = await createService.create({
      name: 'Footer',
      category: 'layout',
      componentId: 'footer',
      componentVersion: 1,
      props: {},
    });
    const service = createSavedComponentService(
      repository,
      createTemplateRepository([templateWithReusableBlock(component.id)])
    );

    const result = await service.remove(component.id);

    expect(result.status).toBe('in-use');
    if (result.status === 'in-use') {
      expect(result.templates.map((template) => template.name)).toEqual(['Campaign']);
    }
    expect(await repository.get(component.id)).not.toBeNull();
  });

  it('rejects invalid documents before a write', async () => {
    const service = createSavedComponentService(repository, createTemplateRepository());
    await expect(
      service.create({
        name: '  ',
        category: 'layout',
        componentId: 'header',
        componentVersion: 1,
        props: {},
      })
    ).rejects.toBeInstanceOf(ZodError);
    expect(await repository.list()).toHaveLength(0);
  });

  it('lists reusable components newest first', async () => {
    const service = createSavedComponentService(repository, createTemplateRepository());
    const older = await service.create({
      name: 'Older',
      category: 'layout',
      componentId: 'header',
      componentVersion: 1,
      props: {},
    });
    const newer = await service.create({
      name: 'Newer',
      category: 'layout',
      componentId: 'footer',
      componentVersion: 1,
      props: {},
    });
    await repository.save({
      ...older,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await repository.save({
      ...newer,
      updatedAt: '2026-08-24T00:00:00.000Z',
    });

    const listed = await service.list();
    expect(listed.map((component) => component.name)).toEqual(['Newer', 'Older']);
  });

  it('returns not-found when deleting a missing component', async () => {
    const service = createSavedComponentService(repository, createTemplateRepository());
    await expect(service.remove('missing')).resolves.toEqual({ status: 'not-found' });
  });

  it('deletes an unused reusable component', async () => {
    const service = createSavedComponentService(repository, createTemplateRepository());
    const component = await service.create({
      name: 'Hero',
      category: 'promotional',
      componentId: 'hero',
      componentVersion: 1,
      props: {},
    });

    await expect(service.remove(component.id)).resolves.toEqual({ status: 'deleted' });
    expect(await repository.get(component.id)).toBeNull();
  });
});
