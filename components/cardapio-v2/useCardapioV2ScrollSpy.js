'use client';

import { useEffect, useRef, useState } from 'react';

export function useCardapioV2ScrollSpy(sectionIds, options = {}) {
  const { initialId = '', fallbackId = '' } = options;
  const [activeId, setActiveId] = useState(initialId || sectionIds[0] || '');
  const scrollLockRef = useRef(false);

  useEffect(() => {
    setActiveId((prev) => {
      if (prev && sectionIds.includes(prev)) return prev;
      return initialId || sectionIds[0] || '';
    });
  }, [sectionIds, initialId]);

  useEffect(() => {
    if (!sectionIds.length || typeof IntersectionObserver === 'undefined') return undefined;

    const visible = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollLockRef.current) return;

        entries.forEach((entry) => {
          visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        let bestId = '';
        let bestRatio = 0;
        visible.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });

        if (bestId && bestRatio > 0.15) {
          setActiveId((prev) => (prev === bestId ? prev : bestId));
          return;
        }

        if (fallbackId) {
          setActiveId((prev) => (prev === fallbackId ? prev : fallbackId));
        }
      },
      {
        root: null,
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds, fallbackId]);

  function lockScrollSpy(durationMs = 900) {
    scrollLockRef.current = true;
    window.setTimeout(() => {
      scrollLockRef.current = false;
    }, durationMs);
  }

  return { activeId, setActiveId, lockScrollSpy, scrollLockRef };
}
