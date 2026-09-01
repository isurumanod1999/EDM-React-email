import { parseTaggingWorkbook } from '@/lib/tagging/parseWorkbook';
import { discoverLinkableTargets } from '@/lib/tagging/discoverTargets';
import { matchTaggingRows } from '@/lib/tagging/matchRows';
import { applyConfirmedMappings } from '@/lib/tagging/applyMappings';
import type { EmailTemplateDocument } from '@/lib/schema/template';
import type {
  ApplyMappingsResult,
  ConfirmedMapping,
  MatchTaggingResult,
  ParseTaggingResult,
} from '@/lib/tagging/types';
import { getTemplateService } from '@/lib/templates/service';

export interface TaggingService {
  parseWorkbook(buffer: ArrayBuffer | Buffer | Uint8Array): Promise<ParseTaggingResult>;
  match(template: EmailTemplateDocument, rows: ParseTaggingResult['rows']): MatchTaggingResult;
  apply(
    templateId: string,
    mappings: ConfirmedMapping[]
  ): Promise<ApplyMappingsResult & { notFound?: boolean }>;
  applyToDocument(
    template: EmailTemplateDocument,
    mappings: ConfirmedMapping[]
  ): ApplyMappingsResult;
}

export function createTaggingService(): TaggingService {
  return {
    parseWorkbook: (buffer) => parseTaggingWorkbook(buffer),

    match(template, rows) {
      const targets = discoverLinkableTargets(template.blocks);
      return matchTaggingRows(rows, targets);
    },

    applyToDocument(template, mappings) {
      return applyConfirmedMappings(template, mappings);
    },

    async apply(templateId, mappings) {
      const templates = getTemplateService();
      const existing = await templates.get(templateId);
      if (!existing) {
        return {
          template: {
            schemaVersion: 1,
            id: templateId,
            name: '',
            category: 'newsletter',
            meta: { previewText: '', backgroundColor: '#fff', containerWidth: 600 },
            blocks: [],
            createdAt: '',
            updatedAt: '',
          },
          applied: [],
          warnings: [`Template not found: ${templateId}`],
          notFound: true,
        };
      }

      const result = applyConfirmedMappings(existing, mappings);
      const saved = await templates.update(templateId, {
        blocks: result.template.blocks,
        name: result.template.name,
        description: result.template.description,
        category: result.template.category,
        tags: result.template.tags,
        meta: result.template.meta,
      });

      if (!saved) {
        return {
          ...result,
          warnings: [...result.warnings, 'Failed to persist template'],
          notFound: true,
        };
      }

      return { ...result, template: saved };
    },
  };
}

let singleton: TaggingService | null = null;

export function getTaggingService(): TaggingService {
  if (!singleton) singleton = createTaggingService();
  return singleton;
}
