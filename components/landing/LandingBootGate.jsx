'use client';

import { useEffect, useState } from 'react';
import LandingSplash from '@/components/landing/LandingSplash';

/** ~1 ciclo rápido dos 5 mascotes — splash longo destruía Speed Index / LCP. */
const MIN_SPLASH_MS = 1100;
const FADE_MS = 240;
const SPLASH_SEEN_KEY = 'nimbus-landing-splash-seen';

function fadeOutSsrSplash() {
  const el = document.getElementById('landing-ssr-splash');
  if (!el) return;
  el.classList.remove('is-visible');
  window.setTimeout(() => el.remove(), FADE_MS);
}

function removeSsrSplashNow() {
  const el = document.getElementById('landing-ssr-splash');
  if (el) el.remove();
}

/**
 * Splash por cima do conteúdo — sem opacity:0 no miolo.
 * Revisits na mesma sessão pulam o splash (melhor Speed Index).
 */
export default function LandingBootGate({ children }) {
  const [clientSplash, setClientSplash] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SPLASH_SEEN_KEY) === '1';
    } catch {
      seen = false;
    }

    if (seen) {
      removeSsrSplashNow();
      return undefined;
    }

    try {
      sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
    } catch {
      /* ignore */
    }

    const hasSsr = Boolean(document.getElementById('landing-ssr-splash'));
    if (!hasSsr) {
      // Fallback raro: página sem splash SSR
      const id = window.requestAnimationFrame(() => setClientSplash(true));
      const timer = window.setTimeout(() => {
        setClientSplash(false);
      }, MIN_SPLASH_MS);
      return () => {
        window.cancelAnimationFrame(id);
        window.clearTimeout(timer);
      };
    }

    const timer = window.setTimeout(() => {
      fadeOutSsrSplash();
    }, MIN_SPLASH_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      {clientSplash ? <LandingSplash show /> : null}
      {children}
    </>
  );
}
