import { del, get, list, put, type ListBlobResultBlob } from '@vercel/blob';
import type { TemplateRepository } from '@/lib/ports';
import type { EmailTemplateDocument, TemplateSummary } from '@/lib/schema/template';
import { emailTemplateDocumentSchema } from '@/lib/schema/validators';
import { toTemplateSummary } from '@/lib/templates/factory';

const TEMPLATE_PREFIX = 'templates/';
const TOMBSTONE_PREFIX = `${TEMPLATE_PREFIX}.tombstones/`;
const LIST_LIMIT = 1000;

function templatePath(id: string): string {
  return `${TEMPLATE_PREFIX}${id}.json`;
}

function tombstonePath(id: string): string {
  return `${TOMBSTONE_PREFIX}${id}`;
}

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let value = '';

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    value += decoder.decode(chunk.value, { stream: true });
  }

  return value + decoder.decode();
}

async function listAll(prefix: string): Promise<ListBlobResultBlob[]> {
  const blobs: ListBlobResultBlob[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix, limit: LIST_LIMIT, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return blobs;
}

async function blobExists(pathname: string): Promise<boolean> {
  return (
    (await get(pathname, {
      access: 'private',
      useCache: false,
    })) !== null
  );
}

async function readTemplate(pathname: string): Promise<EmailTemplateDocument | null> {
  const result = await get(pathname, {
    access: 'private',
    useCache: false,
  });
  if (!result || result.statusCode !== 200) return null;

  try {
    const raw = await streamToString(result.stream);
    return emailTemplateDocumentSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Durable Vercel Blob template repository with bundled filesystem templates as
 * a read-only fallback. Blob records override bundled records with the same id.
 */
export function createBlobTemplateRepository(
  bundledRepository: TemplateRepository
): TemplateRepository {
  async function getDocument(id: string): Promise<EmailTemplateDocument | null> {
    if (await blobExists(tombstonePath(id))) return null;
    return (await readTemplate(templatePath(id))) ?? bundledRepository.get(id);
  }

  return {
    async list(): Promise<TemplateSummary[]> {
      const [bundled, blobs] = await Promise.all([
        bundledRepository.list(),
        listAll(TEMPLATE_PREFIX),
      ]);

      const tombstonedIds = new Set(
        blobs
          .filter((blob) => blob.pathname.startsWith(TOMBSTONE_PREFIX))
          .map((blob) => blob.pathname.slice(TOMBSTONE_PREFIX.length))
      );
      const templateBlobs = blobs.filter(
        (blob) =>
          blob.pathname.startsWith(TEMPLATE_PREFIX) &&
          !blob.pathname.startsWith(TOMBSTONE_PREFIX) &&
          blob.pathname.endsWith('.json')
      );

      const summaries = new Map(
        bundled
          .filter((summary) => !tombstonedIds.has(summary.id))
          .map((summary) => [summary.id, summary])
      );

      await Promise.all(
        templateBlobs.map(async (blob) => {
          const document = await readTemplate(blob.pathname);
          if (document && !tombstonedIds.has(document.id)) {
            summaries.set(document.id, toTemplateSummary(document));
          }
        })
      );

      return [...summaries.values()].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    },

    async get(id: string): Promise<EmailTemplateDocument | null> {
      return getDocument(id);
    },

    async save(document: EmailTemplateDocument): Promise<EmailTemplateDocument> {
      const validated = emailTemplateDocumentSchema.parse(document);
      await put(templatePath(validated.id), JSON.stringify(validated, null, 2), {
        access: 'private',
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: 'application/json',
      });
      await del(tombstonePath(validated.id));
      return validated;
    },

    async delete(id: string): Promise<boolean> {
      if (!(await getDocument(id))) return false;

      await del(templatePath(id));
      await put(tombstonePath(id), '', {
        access: 'private',
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: 'application/octet-stream',
      });
      return true;
    },
  };
}
