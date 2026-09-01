'use client';

import { useEffect } from 'react';
import { useBuilderStore } from '@/builder/store/builderStore';
import { pushToast } from '@/builder/store/toastStore';

/** Mirror save success/error from the store into the shared toast stack. */
export function useSaveFeedbackToasts(): void {
  const saveMessage = useBuilderStore((s) => s.saveMessage);
  const saveError = useBuilderStore((s) => s.saveError);

  useEffect(() => {
    if (saveMessage) {
      pushToast(saveMessage, 'success', saveMessage === 'Auto-saved' ? 2500 : 4000);
    }
  }, [saveMessage]);

  useEffect(() => {
    if (saveError) {
      pushToast(saveError, 'error', 6000);
    }
  }, [saveError]);
}
