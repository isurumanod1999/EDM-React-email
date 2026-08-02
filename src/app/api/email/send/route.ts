import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import { sendTestRequestSchema } from '@/lib/schema/validators';
import { DynamicEmailTemplate } from '@/lib/render/DynamicEmailTemplate';
import { DEFAULT_TEMPLATE_META } from '@/lib/schema/template';
import { getTemplate } from '@/lib/templates/fileStorage';
import { handleRouteError, notFound, errorResponse } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

/**
 * Resolve the public base URL used to absolutise relative image paths. Email
 * clients can't load `/images/...`, so links must be absolute. Prefer an
 * explicit env var; otherwise fall back to the request origin (works when the
 * app is reachable at a public URL / tunnel).
 */
function resolveBaseUrl(request: Request): string {
  const fromEnv = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const origin = request.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  try {
    return new URL(request.url).origin;
  } catch {
    return '';
  }
}

/** Rewrite root-relative asset URLs (src/background/url(...)) to absolute. */
function absolutizeAssets(html: string, base: string): string {
  if (!base) return html;
  return html
    .replace(/(src|background)="\/(?!\/)/g, `$1="${base}/`)
    .replace(/url\(\s*\/(?!\/)/g, `url(${base}/`);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = sendTestRequestSchema.parse(body);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return errorResponse(
        400,
        'resend_not_configured',
        'RESEND_API_KEY is not set. Add it to .env.local (get a key at https://resend.com/api-keys) and restart the dev server.'
      );
    }

    let meta = parsed.meta ?? DEFAULT_TEMPLATE_META;
    let blocks = parsed.blocks;
    let name = parsed.name ?? 'Test email';

    // Fall back to the saved template only when the client did not send blocks.
    if ((!blocks || blocks.length === 0) && parsed.templateId) {
      const saved = await getTemplate(parsed.templateId);
      if (!saved) {
        return notFound('Template not found');
      }
      meta = saved.meta;
      blocks = saved.blocks;
      name = saved.name;
    }

    if (!blocks || blocks.length === 0) {
      return errorResponse(
        400,
        'empty_canvas',
        'Add at least one component to the canvas before sending.'
      );
    }

    const rendered = await render(DynamicEmailTemplate({ meta, blocks }));
    const html = absolutizeAssets(rendered, resolveBaseUrl(request));

    const subject = parsed.subject?.trim() || name || meta.previewText || 'Test email';
    // Resend's shared sender works without domain verification (but only to the
    // address that owns the Resend account). Set RESEND_FROM to a verified
    // sender to send to arbitrary recipients.
    const from = process.env.RESEND_FROM || 'onboarding@resend.dev';

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: parsed.to,
      subject,
      html,
    });

    if (error) {
      return errorResponse(400, 'send_rejected', error.message || 'Resend rejected the request.');
    }

    return NextResponse.json({ id: data?.id, to: parsed.to, from, subject });
  } catch (error) {
    console.error('Error sending test email:', error);
    return handleRouteError(error, {
      status: 400,
      code: 'send_failed',
      message: 'Failed to send email',
    });
  }
}
