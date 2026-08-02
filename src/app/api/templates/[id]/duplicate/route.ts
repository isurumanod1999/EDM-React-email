import { NextRequest, NextResponse } from 'next/server';
import { getTemplateService } from '@/lib/templates/service';
import { notFound } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const duplicate = await getTemplateService().duplicate(id);

  if (!duplicate) {
    return notFound('Template not found');
  }

  return NextResponse.json({ template: duplicate }, { status: 201 });
}
