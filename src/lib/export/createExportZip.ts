import JSZip from 'jszip';
import type { BundledImage } from './bundleImages';
import { sanitizeExportName } from './sanitizeName';

export interface EmailExportPackage {
  baseName: string;
  htmlFileName: string;
  html: string;
  images: BundledImage[];
  zipBuffer: Buffer;
}

export async function createExportZip(
  templateName: string,
  html: string,
  images: BundledImage[]
): Promise<EmailExportPackage> {
  const baseName = sanitizeExportName(templateName);
  const htmlFileName = `${baseName}.html`;

  const zip = new JSZip();
  zip.file(htmlFileName, html);

  if (images.length > 0) {
    const imgFolder = zip.folder('img');
    if (imgFolder) {
      for (const image of images) {
        const fileName = image.relativePath.replace(/^img\//, '');
        imgFolder.file(fileName, image.buffer);
      }
    }
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return {
    baseName,
    htmlFileName,
    html,
    images,
    zipBuffer,
  };
}
