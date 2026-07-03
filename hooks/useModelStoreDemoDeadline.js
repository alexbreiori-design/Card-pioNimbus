'use client';

import { useEffect, useState } from 'react';
import { isModelStoreSlug } from '@/lib/superAdmin/modelStore';

export function useModelStoreDemoDeadline(storeSlug) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!storeSlug || !isModelStoreSlug(storeSlug)) {
      setEnabled(false);
      return undefined;
    }

    fetch('/api/super-admin/me')
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) setEnabled(Boolean(payload?.superAdmin));
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });

    return () => {
      cancelled = true;
    };
  }, [storeSlug]);

  return enabled;
}
