import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { errorResponse, notFound } from '@/lib/api/response';
import TwoColDualCtaEmail from '@/emails/TwoColDualCtaEmail';
import TwoColStackedEmail from '@/emails/TwoColStackedEmail';
import CompleteEmail from '@/emails/CompleteEmail';
import AllComponentsEmail from '@/emails/AllComponentsEmail';
import NissanEmail from '@/emails/NissanEmail';

const templates: Record<string, React.FC> = {
  'two-col-dual-cta': TwoColDualCtaEmail,
  'two-col-stacked': TwoColStackedEmail,
  'complete-email': CompleteEmail,
  'all-components': AllComponentsEmail,
  'nissan': NissanEmail,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ template: string }> }
) {
  const { template } = await params;
  
  const EmailComponent = templates[template];
  
  if (!EmailComponent) {
    return notFound('Template not found');
  }

  try {
    const html = await render(EmailComponent({}));
    
    return NextResponse.json({ html });
  } catch (error) {
    console.error('Error rendering email:', error);
    return errorResponse(500, 'render_failed', 'Failed to render email');
  }
}
