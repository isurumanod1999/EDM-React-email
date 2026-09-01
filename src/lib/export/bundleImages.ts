import { promises as fs } from 'fs';
import path from 'path';

export const EXPORT_IMG_DIR = 'img';

export interface BundledImage {
  /** Path inside the export package, e.g. img/logo.png */
  relativePath: string;
  buffer: Buffer;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceAllLiteral(html: string, search: string, replace: string): string {
  if (!search || search === replace) return html;
  return html.replace(new RegExp(escapeRegExp(search), 'g'), replace);
}

/** Collect image URLs from rendered HTML */
export function collectImageUrls(html: string): string[] {
  const urls = new Set<string>();

  const srcPattern = /\bsrc\s*=\s*["']([^"']+)["']/gi;
  const bgPattern = /url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi;

  let match: RegExpExecArray | null;
  while ((match = srcPattern.exec(html)) !== null) {
    const url = match[1].trim();
    if (url && !url.startsWith('data:')) urls.add(url);
  }
  while ((match = bgPattern.exec(html)) !== null) {
    const url = match[1].trim();
    if (url && !url.startsWith('data:')) urls.add(url);
  }

  return [...urls];
}

async function readLocalImage(urlPath: string): Promise<{ buffer: Buffer; ext: string } | null> {
  const decoded = decodeURIComponent(urlPath);
  const relative = decoded.startsWith('/') ? decoded.slice(1) : decoded;
  const filePath = path.join(process.cwd(), 'public', relative);

  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath) || '.png';
    return { buffer, ext };
  } catch {
    return null;
  }
}

async function fetchRemoteImage(
  url: string
): Promise<{ buffer: Buffer; ext: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') ?? '';
    let ext = '.png';

    if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';
    else if (contentType.includes('gif')) ext = '.gif';
    else if (contentType.includes('webp')) ext = '.webp';
    else if (contentType.includes('svg')) ext = '.svg';
    else {
      try {
        const urlExt = path.extname(new URL(url).pathname);
        if (urlExt) ext = urlExt.split('?')[0];
      } catch {
        /* ignore invalid URL */
      }
    }

    return { buffer, ext };
  } catch {
    return null;
  }
}

function pickFilename(
  sourceUrl: string,
  ext: string,
  usedFilenames: Set<string>,
  urlToFilename: Map<string, string>
): string {
  const existing = urlToFilename.get(sourceUrl);
  if (existing) return existing;

  const fromUrl = path.basename(decodeURIComponent(sourceUrl.split('?')[0]));
  let base = (fromUrl || 'image')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');

  if (!path.extname(base)) {
    base += ext.startsWith('.') ? ext : `.${ext}`;
  }

  let candidate = base;
  let index = 1;

  while (usedFilenames.has(candidate)) {
    const stem = path.basename(base, path.extname(base));
    const extension = path.extname(base) || ext;
    candidate = `${stem}-${index}${extension}`;
    index += 1;
  }

  usedFilenames.add(candidate);
  urlToFilename.set(sourceUrl, candidate);
  return candidate;
}

async function resolveImage(
  url: string
): Promise<{ buffer: Buffer; ext: string } | null> {
  if (url.startsWith('/')) {
    return readLocalImage(url);
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return fetchRemoteImage(url);
  }
  return null;
}

/** Download / copy images and rewrite HTML to use img/ relative paths */
export async function bundleImagesInHtml(html: string): Promise<{
  html: string;
  images: BundledImage[];
}> {
  const urls = collectImageUrls(html);
  const images: BundledImage[] = [];
  const urlToFilename = new Map<string, string>();
  const usedFilenames = new Set<string>();

  let processed = html;

  for (const url of urls) {
    const resolved = await resolveImage(url);
    if (!resolved) continue;

    const filename = pickFilename(url, resolved.ext, usedFilenames, urlToFilename);
    const relativePath = `${EXPORT_IMG_DIR}/${filename}`;

    images.push({ relativePath, buffer: resolved.buffer });

    processed = replaceAllLiteral(processed, url, relativePath);

    try {
      const encoded = encodeURI(url);
      if (encoded !== url) {
        processed = replaceAllLiteral(processed, encoded, relativePath);
      }
    } catch {
      /* ignore */
    }

    if (url.startsWith('/')) {
      const decoded = decodeURIComponent(url);
      if (decoded !== url) {
        processed = replaceAllLiteral(processed, decoded, relativePath);
      }
    }
  }

  return { html: processed, images };
}
