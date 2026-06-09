'use client';

import { useEffect, useRef } from 'react';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function LandingScene({ id, className = '', children }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const inner = node.querySelector('.landing-scene__inner');
    if (!inner) return undefined;

    let frame = 0;
    const MAX_BLUR = 4;
    const MAX_SHIFT = 6;
    const EDGE_PX = 72;

    const updateVisibility = () => {
      const rect = node.getBoundingClientRect();
      const viewHeight = window.innerHeight;
      const visibleTop = Math.max(rect.top, 0);
      const visibleBottom = Math.min(rect.bottom, viewHeight);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibleRatio = clamp(visibleHeight / Math.min(rect.height, viewHeight), 0, 1);
      const entryProgress = clamp((viewHeight - rect.top) / EDGE_PX, 0, 1);
      const exitProgress = clamp(rect.bottom / EDGE_PX, 0, 1);
      const edgeProgress = Math.min(entryProgress, exitProgress, visibleRatio);
      const eased = edgeProgress * edgeProgress * (3 - 2 * edgeProgress);
      const blur = (1 - eased) * MAX_BLUR;
      const center = rect.top + rect.height / 2;
      const shift = (1 - eased) * MAX_SHIFT * (center < viewHeight / 2 ? -1 : 1);

      inner.style.setProperty('--scene-opacity', String(0.9 + eased * 0.1));
      inner.style.setProperty('--scene-blur', `${blur.toFixed(2)}px`);
      inner.style.setProperty('--scene-y', `${shift.toFixed(2)}px`);
      inner.style.setProperty('--scene-child-blur', '0px');
      inner.style.setProperty('--scene-child-y', '0px');
      inner.style.setProperty('--scene-scale', '1');
      node.style.setProperty('--scene-visibility', eased.toFixed(4));
      node.dataset.scenePhase = visibleRatio > 0 ? 'visible' : 'hidden';
      frame = 0;
    };

    const requestUpdate = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(updateVisibility);
      }
    };

    updateVisibility();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return (
    <section
      ref={ref}
      id={id}
      className={`landing-scene${className ? ` ${className}` : ''}`}
      data-scene-phase="hidden"
    >
      <div className="landing-scene__inner">{children}</div>
    </section>
  );
}
