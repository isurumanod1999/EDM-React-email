import { NextResponse } from 'next/server';
import { checkOllamaStatus } from '@/lib/ai/checkOllamaStatus';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await checkOllamaStatus();
  return NextResponse.json(status);
}
