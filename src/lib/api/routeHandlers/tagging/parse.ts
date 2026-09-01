import { NextResponse } from 'next/server';
import { errorResponse, handleRouteError } from '@/lib/api/response';
import { getTaggingService } from '@/lib/tagging/service';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXT = /\.xlsx$/i;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return errorResponse(400, 'no_file', 'No file provided');
    }

    if (!ALLOWED_EXT.test(file.name)) {
      return errorResponse(400, 'invalid_file_type', 'Invalid file type. Expected .xlsx');
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(400, 'file_too_large', 'File too large (max 10 MB)');
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const result = await getTaggingService().parseWorkbook(data);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Tagging parse error:', error);
    const message = error instanceof Error ? error.message : 'Tagging parse failed';
    return handleRouteError(error, {
      status: 400,
      code: 'tagging_parse_failed',
      message,
    });
  }
}
