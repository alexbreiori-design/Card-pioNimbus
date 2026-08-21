'use client';

import { useEffect, useState } from 'react';
import { LANDING_LOAD_FRAMES } from '@/lib/landing/loadFrames';

const FADE_MS = 280;

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
      <div className="landing-splash__stage">
        {LANDING_LOAD_FRAMES.map((src, index) => (
          // eslint-disable-next-line @next/next/no-img-element -- splash client fallback
          <img
            key={src}
            className="landing-splash__mascot"
            src={src}
            alt=""
            width={360}
            height={360}
            decoding="async"
            fetchPriority={index === 0 ? 'high' : 'low'}
            style={{ animationDelay: `${index * 0.22}s` }}
          />
        ))}
      </div>
    </div>
  );
}
