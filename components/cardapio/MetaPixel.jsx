'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initMetaPixel, sanitizeMetaPixelId, trackMetaPageView } from '@/lib/meta/pixel';

export default function MetaPixel({ pixelId }) {
  const pathname = usePathname();
  const safePixelId = sanitizeMetaPixelId(pixelId);

  useEffect(() => {
    if (!safePixelId) return undefined;
    initMetaPixel(safePixelId);
    trackMetaPageView();
    return undefined;
  }, [safePixelId]);

  useEffect(() => {
    if (!safePixelId) return undefined;
    if (initMetaPixel(safePixelId)) {
      trackMetaPageView();
    }
    return undefined;
  }, [pathname, safePixelId]);

  if (!safePixelId) return null;

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${encodeURIComponent(safePixelId)}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
