/**
 * Export saved builder templates to out/exports/{template-name}/ with img/ folder + ZIP.
 * Run: npx tsx scripts/export-templates.ts
 *      npx tsx scripts/export-templates.ts <template-id>
 */
import { promises as fs } from 'fs';
import path from 'path';
import { render } from '@react-email/render';
import { DynamicEmailTemplate } from '../src/lib/render/DynamicEmailTemplate';
import { exportEmailToDisk } from '../src/lib/export';
import { getTemplate, listTemplates } from '../src/lib/templates/fileStorage';

const OUTPUT_ROOT = path.join(process.cwd(), 'out', 'exports');

async function exportOne(id: string): Promise<void> {
  const template = await getTemplate(id);
  if (!template) {
    throw new Error(`Template not found: ${id}`);
  }

  const html = await render(
    DynamicEmailTemplate({
      meta: template.meta,
      blocks: template.blocks,
    })
  );

  const { folderPath, zipPath } = await exportEmailToDisk(
    html,
    template.name,
    OUTPUT_ROOT
  );

  console.log(`✓ ${template.name}`);
  console.log(`  Folder: ${folderPath}`);
  console.log(`  ZIP:    ${zipPath}`);
}

async function main() {
  const targetId = process.argv[2];
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });

  if (targetId) {
    await exportOne(targetId);
    return;
  }

  const templates = await listTemplates();
  if (templates.length === 0) {
    console.log('No templates in data/templates/. Create one in the builder first.');
    return;
  }

  for (const summary of templates) {
    await exportOne(summary.id);
  }

  console.log(`\nDone. Exports written to ${OUTPUT_ROOT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
