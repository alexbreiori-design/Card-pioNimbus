'use client';

import { useEffect, useRef, useState } from 'react';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getVisibleRatio(rect, viewHeight) {
  const visibleTop = Math.max(0, rect.top);
  const visibleBottom = Math.min(viewHeight, rect.bottom);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  return visibleHeight / Math.max(rect.height, 1);
}

export default function LandingScene({ id, className = '', children }) {
  const ref = useRef(null);
  const [visibility, setVisibility] = useState(0);
  const scrollStateRef = useRef({
    wasAboveThreshold: false,
    needsUnblurOnScroll: false,
    bootstrapped: false,
  });
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const inner = node.querySelector('.landing-scene__inner');
    if (!inner) return undefined;

    const EXIT_BLUR = 12;
    const ENTER_BLUR = 12;
    const THRESHOLD = 0.3;

    const updateVisibility = () => {
      const rect = node.getBoundingClientRect();
      const viewHeight = window.innerHeight;
      const visibleRatio = getVisibleRatio(rect, viewHeight);
      const state = scrollStateRef.current;
      const currentScrollY = window.scrollY;
      const didScroll = currentScrollY !== lastScrollYRef.current;
      const isAboveThreshold = visibleRatio >= THRESHOLD;
      const crossedThisFrame = isAboveThreshold && !state.wasAboveThreshold;

      if (didScroll && state.needsUnblurOnScroll && !crossedThisFrame) {
        state.needsUnblurOnScroll = false;
      }

      lastScrollYRef.current = currentScrollY;

      if (rect.bottom <= 0 || rect.top >= viewHeight) {
        state.wasAboveThreshold = false;
        state.needsUnblurOnScroll = false;
        setVisibility(0);
        inner.style.setProperty('--scene-opacity', '0');
        inner.style.setProperty('--scene-blur', '0px');
        return;
      }

      const leavingThroughTop = rect.top < 0;

      if (leavingThroughTop) {
        state.wasAboveThreshold = false;
        state.needsUnblurOnScroll = false;

        if (visibleRatio > THRESHOLD) {
          setVisibility(1);
          inner.style.setProperty('--scene-opacity', '1');
          inner.style.setProperty('--scene-blur', '0px');
          return;
        }

        const progress = clamp(visibleRatio / THRESHOLD, 0, 1);
        setVisibility(progress);
        inner.style.setProperty('--scene-opacity', String(progress));
        inner.style.setProperty('--scene-blur', `${(1 - progress) * EXIT_BLUR}px`);
        return;
      }

      if (!state.bootstrapped && isAboveThreshold) {
        state.bootstrapped = true;
        state.wasAboveThreshold = true;
        state.needsUnblurOnScroll = false;
        setVisibility(1);
        inner.style.setProperty('--scene-opacity', '1');
        inner.style.setProperty('--scene-blur', '0px');
        return;
      }

      if (isAboveThreshold) {
        if (crossedThisFrame) {
          state.needsUnblurOnScroll = true;
        }

        state.wasAboveThreshold = true;
        const blur = state.needsUnblurOnScroll ? ENTER_BLUR : 0;
        setVisibility(1);
        inner.style.setProperty('--scene-opacity', '1');
        inner.style.setProperty('--scene-blur', `${blur}px`);
        return;
      }

      state.wasAboveThreshold = false;
      state.needsUnblurOnScroll = false;
      setVisibility(0);
      inner.style.setProperty('--scene-opacity', '0');
      inner.style.setProperty('--scene-blur', '0px');
    };

    lastScrollYRef.current = window.scrollY;
    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility);

    return () => {
      window.removeEventListener('scroll', updateVisibility);
      window.removeEventListener('resize', updateVisibility);
    };
  }, []);

  const phase =
    visibility >= 0.98 ? 'active' : visibility <= 0.02 ? 'hidden' : 'transition';

  return (
    <section
      ref={ref}
      id={id}
      className={`landing-scene landing-scene--${phase}${className ? ` ${className}` : ''}`}
      style={{ '--scene-visibility': visibility }}
    >
      <div className="landing-scene__inner">{children}</div>
    </section>
  );
}
