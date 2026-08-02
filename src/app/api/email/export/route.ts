import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { exportTemplateRequestSchema } from '@/lib/schema/validators';
import { DynamicEmailTemplate } from '@/lib/render/DynamicEmailTemplate';
import { DEFAULT_TEMPLATE_META } from '@/lib/schema/template';
import { getTemplate } from '@/lib/templates/fileStorage';
import { buildEmailExport } from '@/lib/export';
import { handleRouteError, notFound, errorResponse } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = exportTemplateRequestSchema.parse(body);

    let templateName = parsed.name ?? 'email-template';
    let meta = parsed.meta ?? DEFAULT_TEMPLATE_META;
    let blocks = parsed.blocks;

    // Fall back to saved file only when the client did not send blocks
    if ((!blocks || blocks.length === 0) && parsed.templateId) {
      const saved = await getTemplate(parsed.templateId);
      if (!saved) {
        return notFound('Template not found');
      }
      templateName = saved.name;
      meta = saved.meta;
      blocks = saved.blocks;
    }

    if (!blocks || blocks.length === 0) {
      return errorResponse(
        400,
        'empty_canvas',
        'Add at least one component to the canvas before exporting.'
      );
    }

    const html = await render(
      DynamicEmailTemplate({
        meta,
        blocks,
      })
    );

    const pkg = await buildEmailExport(html, templateName);

    return new NextResponse(Buffer.from(pkg.zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${pkg.baseName}.zip"`,
        'Content-Length': String(pkg.zipBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error exporting email:', error);
    return handleRouteError(error, {
      status: 400,
      code: 'export_failed',
      message: 'Failed to export email',
    });
  }
}
