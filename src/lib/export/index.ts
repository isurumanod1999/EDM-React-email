import { promises as fs } from 'fs';
import path from 'path';
import { bundleImagesInHtml } from './bundleImages';
import { createExportZip } from './createExportZip';
import { enhanceEmailHtml } from './enhanceEmailHtml';
import { sanitizeExportName } from './sanitizeName';
import { wrapHtmlLines } from './wrapHtmlLines';

export { sanitizeExportName } from './sanitizeName';
export { enhanceEmailHtml } from './enhanceEmailHtml';
export { wrapHtmlLines } from './wrapHtmlLines';
export { bundleImagesInHtml, collectImageUrls, EXPORT_IMG_DIR } from './bundleImages';
export type { BundledImage } from './bundleImages';
export { createExportZip } from './createExportZip';
export type { EmailExportPackage } from './createExportZip';

/** Full pipeline: enhance HTML, bundle images, build ZIP */
export async function buildEmailExport(html: string, templateName: string) {
  const enhanced = enhanceEmailHtml(html);
  const { html: htmlWithLocalImages, images } = await bundleImagesInHtml(enhanced);
  return createExportZip(templateName, wrapHtmlLines(htmlWithLocalImages), images);
}

/** Write export folder (template-name.html + img/) for Gulp / CLI */
export async function writeEmailExportFolder(
  templateName: string,
  html: string,
  images: Awaited<ReturnType<typeof bundleImagesInHtml>>['images'],
  outputRoot: string
): Promise<string> {
  const baseName = sanitizeExportName(templateName);
  const folderPath = path.join(outputRoot, baseName);
  const imgPath = path.join(folderPath, 'img');

  await fs.mkdir(imgPath, { recursive: true });
  await fs.writeFile(path.join(folderPath, `${baseName}.html`), html, 'utf8');

  for (const image of images) {
    const fileName = image.relativePath.replace(/^img\//, '');
    await fs.writeFile(path.join(imgPath, fileName), image.buffer);
  }

  return folderPath;
}

/** Enhance, bundle images, write folder, and write ZIP beside it */
export async function exportEmailToDisk(
  html: string,
  templateName: string,
  outputRoot: string
): Promise<{ folderPath: string; zipPath: string; package: Awaited<ReturnType<typeof buildEmailExport>> }> {
  const pkg = await buildEmailExport(html, templateName);

  await fs.mkdir(outputRoot, { recursive: true });
  const folderPath = await writeEmailExportFolder(
    templateName,
    pkg.html,
    pkg.images,
    outputRoot
  );

  const zipPath = path.join(outputRoot, `${pkg.baseName}.zip`);
  await fs.writeFile(zipPath, pkg.zipBuffer);

  return { folderPath, zipPath, package: pkg };
}
