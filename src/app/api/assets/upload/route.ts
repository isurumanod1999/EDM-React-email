import { NextResponse } from 'next/server';
import { createLocalAssetStore } from '@/lib/adapters/local-assets/assetStore';
import { errorResponse, handleRouteError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']);

const assetStore = createLocalAssetStore();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return errorResponse(400, 'no_file', 'No file provided');
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return errorResponse(400, 'invalid_file_type', 'Invalid file type. Allowed: PNG, JPEG, WebP, GIF');
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(400, 'file_too_large', 'File too large (max 10 MB)');
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const stored = await assetStore.put({ data, contentType: file.type, filename: file.name });

    return NextResponse.json({ url: stored.url, filename: stored.key, size: file.size });
  } catch (error) {
    console.error('Upload error:', error);
    return handleRouteError(error, {
      status: 500,
      code: 'upload_failed',
      message: 'Upload failed',
    });
  }
}
