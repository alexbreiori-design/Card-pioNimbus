'use client';

import { useEffect, useState } from 'react';
import LandingSplash from '@/components/landing/LandingSplash';

/** Um ciclo dos 5 mascotes (~0,55s cada). */
const MIN_SPLASH_MS = 2800;
const FADE_MS = 280;
const FRAME_STEP_S = 0.55;

function fadeOutSsrSplash() {
  const el = document.getElementById('landing-ssr-splash');
  if (!el) return;
  el.classList.remove('is-visible');
  window.setTimeout(() => el.remove(), FADE_MS);
}

/**
 * Splash por cima do conteúdo — sem opacity:0 no miolo (isso destruía o LCP).
 */
export default function LandingBootGate({ children }) {
  const [showSplash, setShowSplash] = useState(true);
  const [hasSsrSplash, setHasSsrSplash] = useState(true);

  useEffect(() => {
    setHasSsrSplash(Boolean(document.getElementById('landing-ssr-splash')));
    const timer = window.setTimeout(() => {
      setShowSplash(false);
      fadeOutSsrSplash();
    }, MIN_SPLASH_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      {hasSsrSplash ? null : <LandingSplash show={showSplash} />}
      {children}
    </>
  );
}
