'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EmailTemplateDocument } from '@/lib/schema/template';

export function useTemplatePreview(
  template: EmailTemplateDocument | null,
  debounceMs = 400,
  editable = false
) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const previewKey = useMemo(
    () =>
      template
        ? JSON.stringify({ meta: template.meta, blocks: template.blocks, editable })
        : null,
    [template, editable]
  );

  const retry = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!previewKey) {
      setHtml('');
      setError(null);
      setLoading(false);
      setIsPending(false);
      return;
    }

    const payload = JSON.parse(previewKey) as {
      meta: EmailTemplateDocument['meta'];
      blocks: EmailTemplateDocument['blocks'];
      editable: boolean;
    };

    setIsPending(true);
    setError(null);

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsPending(false);
      setLoading(true);

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
        setHtml(data.html ?? '');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Preview failed');
        }
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
      setIsPending(false);
    };
  }, [previewKey, debounceMs, refreshToken]);

  const isStale = isPending || (loading && html.length > 0);

  return { html, loading, isPending, isStale, error, retry };
}
