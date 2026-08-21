'use client';

import { useEffect, useRef, useState } from 'react';
import LandingSplash from '@/components/landing/LandingSplash';
import { LANDING_LOAD_FRAMES } from '@/lib/landing/loadFrames';

const MIN_HOLD_AFTER_READY_MS = 160;
const MAX_BOOT_WAIT_MS = 800;
const FADE_MS = 220;
const FRAME_STEP_S = 0.7;

function waitForFirstSplashFrame() {
  return new Promise((resolve) => {
    const img = document.querySelector('#landing-ssr-splash .landing-splash__mascot, .landing-splash__mascot');
    if (!img) {
      resolve();
      return;
    }
    if (img.complete && img.naturalWidth > 0) {
      resolve();
      return;
    }
    const done = () => resolve();
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
    window.setTimeout(done, 400);
  });
}

function enrichSsrSplashFrames() {
  const stage = document.querySelector('#landing-ssr-splash [data-landing-splash-stage="true"]');
  if (!stage || stage.dataset.enriched === '1') return;
  stage.dataset.enriched = '1';

  LANDING_LOAD_FRAMES.slice(1).forEach((src, i) => {
    const img = document.createElement('img');
    img.className = 'landing-splash__mascot';
    img.src = src;
    img.alt = '';
    img.width = 360;
    img.height = 360;
    img.decoding = 'async';
    img.fetchPriority = 'low';
    img.style.animationDelay = `${(i + 1) * FRAME_STEP_S}s`;
    stage.appendChild(img);
  });
}

function fadeOutSsrSplash() {
  const el = document.getElementById('landing-ssr-splash');
  if (!el) return;
  el.classList.remove('is-visible');
  window.setTimeout(() => el.remove(), FADE_MS);
}

export default function LandingBootGate({ children }) {
  const [showSplash, setShowSplash] = useState(true);
  const [bootTimedOut, setBootTimedOut] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [hasSsrSplash, setHasSsrSplash] = useState(true);
  const readyAtRef = useRef(null);

  useEffect(() => {
    setHasSsrSplash(Boolean(document.getElementById('landing-ssr-splash')));
    const schedule =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (cb) => window.requestIdleCallback(cb, { timeout: 700 })
        : (cb) => window.setTimeout(cb, 80);
    const id = schedule(() => enrichSsrSplashFrames());
    return () => {
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(id);
      } else {
        window.clearTimeout(id);
      }
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setBootTimedOut(true), MAX_BOOT_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await waitForFirstSplashFrame();
      if (!cancelled) setAssetsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const bootReady = assetsReady || bootTimedOut;

  useEffect(() => {
    if (!bootReady) {
      readyAtRef.current = null;
      return undefined;
    }

    if (!readyAtRef.current) {
      readyAtRef.current = Date.now();
    }

    const elapsed = Date.now() - readyAtRef.current;
    const delay = Math.max(0, MIN_HOLD_AFTER_READY_MS - elapsed);
    const timer = window.setTimeout(() => {
      setShowSplash(false);
      fadeOutSsrSplash();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [bootReady]);

  return (
    <>
      {hasSsrSplash ? null : <LandingSplash show={showSplash} />}
      <div className={`landing-boot-content${showSplash ? '' : ' is-visible'}`}>{children}</div>
    </>
  );
}
