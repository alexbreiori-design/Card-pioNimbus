'use client';

import { useEffect } from 'react';

/**
 * Carrega o CSS below-fold fora do caminho crítico de renderização.
 */
export default function LandingDeferredStyles() {
  useEffect(() => {
    const load = () => {
      import('@/styles/landing-below.css');
    };

    const schedule =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (cb) => window.requestIdleCallback(cb, { timeout: 1200 })
        : (cb) => window.setTimeout(cb, 200);

    const id = schedule(load);
    return () => {
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(id);
      } else {
        window.clearTimeout(id);
      }
    };
  }, []);

  return null;
}
