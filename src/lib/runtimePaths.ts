import path from 'path';

/**
 * Vercel serverless filesystems are read-only except `/tmp`.
 * Bundled templates/assets stay in the deployment; runtime writes go under `/tmp/edm`.
 */
export const VERCEL_RUNTIME_ROOT = '/tmp/edm';

export function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

export function writableRoot(): string {
  return isVercelRuntime() ? VERCEL_RUNTIME_ROOT : process.cwd();
}

export function uploadDirectory(): string {
  return path.join(writableRoot(), 'public', 'images', 'uploads');
}

export function bundledUploadDirectory(): string {
  return path.join(process.cwd(), 'public', 'images', 'uploads');
}

export function figmaDebugDirectory(): string {
  return path.join(writableRoot(), 'data', 'figma-debug');
}

/** Hobby plan max. Longer values are rejected at deploy time. */
export const VERCEL_HEAVY_ROUTE_SECONDS = 60;

const SAFE_UPLOAD_NAME = /^[A-Za-z0-9._-]+$/;

export function isSafeUploadFilename(filename: string): boolean {
  return Boolean(filename) && !filename.includes('..') && SAFE_UPLOAD_NAME.test(filename);
}

export function resolveUploadFilePath(publicUrl: string): string {
  const filename = publicUrl.replace(/^\/images\/uploads\//, '');
  if (filename && filename !== publicUrl.replace(/^\//, '')) {
    return path.join(uploadDirectory(), filename);
  }
  return path.join(writableRoot(), publicUrl.replace(/^\//, ''));
}
