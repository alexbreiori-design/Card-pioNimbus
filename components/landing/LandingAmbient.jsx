'use client';

import { useEffect, useRef } from 'react';

export default function LandingAmbient() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return undefined;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    function onMove(event) {
      const nx = (event.clientX / window.innerWidth - 0.5) * 2;
      const ny = (event.clientY / window.innerHeight - 0.5) * 2;
      targetX = nx;
      targetY = ny;
    }

    function tick() {
      currentX += (targetX - currentX) * 0.11;
      currentY += (targetY - currentY) * 0.11;
      root.style.setProperty('--mx', String(currentX));
      root.style.setProperty('--my', String(currentY));
      frame = window.requestAnimationFrame(tick);
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={rootRef} className="landing-ambient" aria-hidden="true">
      <div className="landing-aurora landing-aurora--blue" />
      <div className="landing-aurora landing-aurora--lilac" />
      <div className="landing-aurora landing-aurora--pink" />
      <div className="landing-ambient__grain" />
    </div>
  );
}
