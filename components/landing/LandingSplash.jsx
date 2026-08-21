'use client';

import { useEffect, useState } from 'react';
import LandingSplashMascots from '@/components/landing/LandingSplashMascots';

const FADE_MS = 220;

export default function LandingSplash({ show }) {
  const [mounted, setMounted] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (show) return undefined;
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [show]);

  if (!mounted) return null;

  return (
    <div className={`landing-splash${visible ? ' is-visible' : ''}`} aria-hidden="true">
      <LandingSplashMascots />
    </div>
  );
}
