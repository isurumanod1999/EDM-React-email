'use client';

import { useEffect } from 'react';
import { useBuilderStore } from '@/builder/store/builderStore';

export function useAutoSave(enabled = true, intervalMs = 30000) {
  const isDirty = useBuilderStore((s) => s.isDirty);
  const isSaving = useBuilderStore((s) => s.isSaving);
  const save = useBuilderStore((s) => s.save);

  useEffect(() => {
    if (!enabled || !isDirty || isSaving) return;

    const timer = setInterval(() => {
      if (useBuilderStore.getState().isDirty) {
        save({ auto: true });
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [enabled, isDirty, isSaving, save, intervalMs]);
}
