'use client';

import { useEffect, useState } from 'react';
import { LANDING_LOAD_FRAMES } from '@/lib/landing/loadFrames';

const FRAME_STEP_S = 0.7;

/**
 * Stage do splash: 1º frame no caminho crítico; demais após idle.
 */
export default function LandingSplashMascots({ eagerAll = false }) {
  const [frames, setFrames] = useState(() =>
    eagerAll ? LANDING_LOAD_FRAMES : LANDING_LOAD_FRAMES.slice(0, 1)
  );

  useEffect(() => {
    if (eagerAll || frames.length >= LANDING_LOAD_FRAMES.length) return undefined;

    const enrich = () => setFrames(LANDING_LOAD_FRAMES);
    const schedule =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (cb) => window.requestIdleCallback(cb, { timeout: 900 })
        : (cb) => window.setTimeout(cb, 120);
    const cancel =
      typeof window !== 'undefined' && 'cancelIdleCallback' in window
        ? (id) => window.cancelIdleCallback(id)
        : (id) => window.clearTimeout(id);

    const id = schedule(enrich);
    return () => cancel(id);
  }, [eagerAll, frames.length]);

  return (
    <div className="landing-splash__stage">
      {frames.map((src, index) => (
        // eslint-disable-next-line @next/next/no-img-element -- splash leve
        <img
          key={src}
          className="landing-splash__mascot"
          src={src}
          alt=""
          width={360}
          height={360}
          decoding={index === 0 ? 'async' : 'async'}
          fetchPriority={index === 0 ? 'high' : 'low'}
          style={{ animationDelay: `${index * FRAME_STEP_S}s` }}
        />
      ))}
    </div>
  );
}
