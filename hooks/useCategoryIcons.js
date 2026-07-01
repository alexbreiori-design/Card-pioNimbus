'use client';

import { useEffect, useState } from 'react';
import { CATEGORY_ICONS } from '@/lib/categoryIcons';

export function useCategoryIcons() {
  const [icons, setIcons] = useState(CATEGORY_ICONS);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/admin/category-icons', { credentials: 'include', cache: 'no-store' });
        const json = await res.json();
        if (!cancelled && res.ok && json.ok && Array.isArray(json.icons) && json.icons.length) {
          setIcons(json.icons);
        }
      } catch {
        /* mantém fallback estático */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return icons;
}
