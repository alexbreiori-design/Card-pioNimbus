'use client';

import { useEffect, useState } from 'react';
import { LANDING_LOAD_FRAMES } from '@/lib/landing/loadFrames';

const FADE_MS = 220;

/** Intervalo entre mascotes — mais lento que a landing para dar tempo de ver cada um. */
export const ADMIN_SPLASH_STAGGER_S = 1.05;

export default function AdminSplash({ show }) {
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
    <div className={`admin-splash ${visible ? 'admin-splash-visible' : ''}`} aria-hidden="true">
      <div className="admin-splash-stage">
        {LANDING_LOAD_FRAMES.map((src, index) => (
          // eslint-disable-next-line @next/next/no-img-element -- splash leve, mesmos assets da landing
          <img
            key={src}
            className="admin-splash-mascot"
            src={src}
            alt=""
            width={280}
            height={280}
            decoding="async"
            fetchPriority={index === 0 ? 'high' : 'low'}
            loading={index === 0 ? 'eager' : 'lazy'}
            style={{ animationDelay: `${index * ADMIN_SPLASH_STAGGER_S}s` }}
          />
        ))}
      </div>
    </div>
  );
}
