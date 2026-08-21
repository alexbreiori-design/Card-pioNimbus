'use client';

import { useEffect, useState } from 'react';
import LandingSplash from '@/components/landing/LandingSplash';

/** Celular: passagem rápida (Speed Index). Desktop: ciclo dos 5 mascotes. */
const SPLASH_MS_MOBILE = 600;
const SPLASH_MS_DESKTOP = 1100;
const FADE_MS = 240;
const SPLASH_SEEN_KEY = 'nimbus-landing-splash-seen';

function splashDuration() {
  const isMobile = window.matchMedia('(max-width: 720px)').matches;
  return isMobile ? SPLASH_MS_MOBILE : SPLASH_MS_DESKTOP;
}

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
 * Splash por cima do conteúdo — o conteúdo é pintado desde o primeiro frame.
 * Revisits na mesma sessão pulam o splash.
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

    const duration = splashDuration();
    const hasSsr = Boolean(document.getElementById('landing-ssr-splash'));

    if (!hasSsr) {
      // Fallback raro: página sem splash SSR
      const frame = window.requestAnimationFrame(() => setClientSplash(true));
      const timer = window.setTimeout(() => setClientSplash(false), duration);
      return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(timer);
      };
    }

    const timer = window.setTimeout(fadeOutSsrSplash, duration);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      {clientSplash ? <LandingSplash show /> : null}
      {children}
    </>
  );
}
