'use client';

import { useCallback, useRef } from 'react';

const MAGNET_RANGE = 96;
const MAGNET_BOOST = 0.24;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function LandingStatsRow({ children }) {
  const rowRef = useRef(null);

  const resetScales = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    row.querySelectorAll('.landing-stat-magnet').forEach((item) => {
      item.style.removeProperty('transform');
    });
  }, []);

  const handleMouseMove = useCallback((event) => {
    const row = rowRef.current;
    if (!row) return;

    const pointerX = event.clientX;
    row.querySelectorAll('.landing-stat-magnet').forEach((item) => {
      const rect = item.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const distance = Math.abs(pointerX - centerX);
      const influence = clamp(1 - distance / MAGNET_RANGE, 0, 1);
      const scale = 1 + influence * MAGNET_BOOST;
      const shiftY = (scale - 1) * 14;
      item.style.transform = `scale(${scale.toFixed(3)}) translateY(${shiftY.toFixed(2)}px)`;
    });
  }, []);

  return (
    <div
      ref={rowRef}
      className="landing-stats"
      onMouseMove={handleMouseMove}
      onMouseLeave={resetScales}
    >
      {children}
    </div>
  );
}
