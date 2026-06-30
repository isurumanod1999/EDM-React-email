'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EmailTemplateDocument } from '@/lib/schema/template';

export function useTemplatePreview(
  template: EmailTemplateDocument | null,
  debounceMs = 400,
  editable = false
) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewKey = useMemo(
    () =>
      template
        ? JSON.stringify({ meta: template.meta, blocks: template.blocks, editable })
        : null,
    [template, editable]
  );

  useEffect(() => {
    if (!previewKey) {
      setHtml('');
      setError(null);
      return;
    }

    const payload = JSON.parse(previewKey) as {
      meta: EmailTemplateDocument['meta'];
      blocks: EmailTemplateDocument['blocks'];
      editable: boolean;
    };

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/email/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? 'Preview failed');
        }

        const data = await res.json();
        setHtml(data.html);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Preview failed');
        }
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [previewKey, debounceMs]);

  return { html, loading, error };
}
