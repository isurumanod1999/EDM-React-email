import { NextResponse } from 'next/server';
import { readUploadedAsset } from '@/lib/adapters/local-assets/assetStore';
import { isSafeUploadFilename } from '@/lib/runtimePaths';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: { filename: string } }
) {
  const filename = context.params.filename;
  if (!isSafeUploadFilename(filename)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const file = await readUploadedAsset(filename);
  if (!file) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(Buffer.from(file.data), {
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
