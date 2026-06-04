'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { sanitizeMetaPixelId, trackMetaPageView } from '@/lib/meta/pixel';

const SCRIPT_ID = 'meta-pixel-fbevents';
const SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

function ensureFbeventsScript() {
  return new Promise((resolve) => {
    if (typeof window.fbq === 'function') {
      resolve();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      const poll = window.setInterval(() => {
        if (typeof window.fbq === 'function') {
          window.clearInterval(poll);
          resolve();
        }
      }, 80);
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = SCRIPT_SRC;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export default function MetaPixel({ pixelId }) {
  const pathname = usePathname();
  const safePixelId = sanitizeMetaPixelId(pixelId);
  const initializedIdRef = useRef(null);

  useEffect(() => {
    if (!safePixelId) {
      initializedIdRef.current = null;
      return undefined;
    }

    let cancelled = false;

    (async () => {
      await ensureFbeventsScript();
      if (cancelled || typeof window.fbq !== 'function') return;

      if (initializedIdRef.current !== safePixelId) {
        window.fbq('init', safePixelId);
        initializedIdRef.current = safePixelId;
      }
      trackMetaPageView();
    })();

    return () => {
      cancelled = true;
    };
  }, [safePixelId]);

  useEffect(() => {
    if (!safePixelId || initializedIdRef.current !== safePixelId) return;
    if (typeof window.fbq !== 'function') return;
    trackMetaPageView();
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
