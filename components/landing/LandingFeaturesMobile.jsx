'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import LandingIcon from '@/components/landing/LandingIcons';
import { landingFeaturesShowcase } from '@/lib/landing/content';

function FeatureMobileMedia({ category }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="landing-features-mobile__placeholder" aria-hidden="true">
        <LandingIcon name={category.icon} />
        <span>{category.title}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- local showcase prints; graceful 404 fallback
    <img
      className="landing-features-mobile__image"
      src={category.image}
      alt={category.imageAlt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

function FeatureMobileCard({ category, style, state }) {
  return (
    <article
      className={`landing-features-mobile__card landing-glass-card landing-glass-card--edged landing-features-mobile__card--${category.tone} is-${state}`}
      style={style}
      aria-hidden={state === 'waiting'}
    >
      <div className="landing-glass-edge" aria-hidden="true" />

      <div className="landing-features-mobile__meta">
        <span
          className={`landing-features-mobile__icon landing-features-mobile__icon--${category.tone}`}
          aria-hidden="true"
        >
          <LandingIcon name={category.icon} />
        </span>
        <div className="landing-features-mobile__copy">
          <h3 className="landing-features-mobile__title">{category.title}</h3>
          <p className="landing-features-mobile__summary">{category.summary}</p>
        </div>
      </div>

      <div className="landing-features-mobile__media">
        <FeatureMobileMedia category={category} />
      </div>

      <ul className="landing-features-mobile__chips">
        {category.chips.map((chip) => (
          <li
            key={`${category.id}-${chip.label}`}
            className={`landing-features-mobile__chip landing-features-mobile__chip--${category.tone}`}
          >
            <span className="landing-features-mobile__chip-icon" aria-hidden="true">
              <LandingIcon name={chip.icon} />
            </span>
            <span className="landing-features-mobile__chip-label">{chip.label}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function measureHeaderBottom() {
  const headerEl =
    document.querySelector('.landing-header--compact .landing-header__dock') ||
    document.querySelector('.landing-header__dock') ||
    document.querySelector('.landing-header');
  if (!headerEl) return 64;
  return Math.max(56, Math.ceil(headerEl.getBoundingClientRect().bottom));
}

function cardVisualState(index, current, advance) {
  if (index < current) return 'stacked';
  if (index === current) return advance > 0.02 ? 'covered' : 'active';
  if (index === current + 1) return 'incoming';
  return 'waiting';
}

function cardVisualStyle(index, current, advance, total) {
  if (index < current) {
    const depth = current - index;
    return {
      zIndex: index + 1,
      opacity: Math.max(0.4, 1 - depth * 0.18),
      transform: `translate3d(0, 0, 0) scale(${Math.max(0.92, 1 - depth * 0.035)})`,
    };
  }

  if (index === current) {
    return {
      zIndex: index + 1,
      opacity: 1,
      transform: `translate3d(0, 0, 0) scale(${1 - 0.03 * advance})`,
    };
  }

  if (index === current + 1) {
    return {
      zIndex: total + 2,
      opacity: 1,
      transform: `translate3d(0, ${(1 - advance) * 100}%, 0)`,
    };
  }

  return {
    zIndex: index + 1,
    opacity: 0,
    transform: 'translate3d(0, 105%, 0)',
    pointerEvents: 'none',
  };
}

export default function LandingFeaturesMobile() {
  const { categories } = landingFeaturesShowcase;
  const reducedMotion = useReducedMotion();
  const trackRef = useRef(null);
  const pinRef = useRef(null);
  const progressRef = useRef(0);
  const layoutRef = useRef({ headerBottom: 64, pinHeight: 0, maxTranslate: 0 });
  const [progress, setProgress] = useState(0);

  const count = categories?.length || 0;

  const { current, advance } = useMemo(() => {
    if (count <= 1) return { current: 0, advance: 0 };
    const scaled = progress * (count - 1);
    const currentIndex = Math.min(count - 1, Math.floor(scaled));
    const local = Math.min(1, Math.max(0, scaled - currentIndex));
    if (currentIndex >= count - 1) return { current: count - 1, advance: 0 };
    return { current: currentIndex, advance: local };
  }, [progress, count]);

  useEffect(() => {
    if (reducedMotion || !count) return undefined;

    const track = trackRef.current;
    const pin = pinRef.current;
    if (!track || !pin) return undefined;

    let frame = 0;
    let layoutLocked = false;
    let lastWidth = window.innerWidth;

    /**
     * Lock pin/track to one viewport snapshot.
     * Recalculating from window.innerHeight on every scroll (or on URL-bar
     * resize) fights mobile chrome — that was the end-of-stack padding jump,
     * flicker, and “crazy” oscillation when rocking the scroll.
     */
    const lockLayout = (force = false) => {
      if (layoutLocked && !force) return;

      const headerBottom = measureHeaderBottom();
      const viewH = window.innerHeight;
      const pinHeight = Math.max(240, viewH - headerBottom);
      const trackHeight = count * pinHeight;
      const maxTranslate = Math.max(0, trackHeight - pinHeight);

      track.style.height = `${trackHeight}px`;
      pin.style.height = `${pinHeight}px`;
      track.style.setProperty('--features-header-offset', `${headerBottom}px`);

      layoutRef.current = { headerBottom, pinHeight, maxTranslate };
      layoutLocked = true;
    };

    const updateScroll = () => {
      frame = 0;

      if (!layoutLocked) {
        const rect = track.getBoundingClientRect();
        const inView = rect.bottom > 0 && rect.top < window.innerHeight;
        if (!inView) return;
        lockLayout(false);
      }

      const { headerBottom, maxTranslate } = layoutRef.current;
      const rect = track.getBoundingClientRect();
      const translateY = Math.min(Math.max(0, headerBottom - rect.top), maxTranslate);
      const travel = Math.max(1, maxTranslate);
      const nextProgress = Math.min(1, Math.max(0, translateY / travel));

      pin.style.transform = `translate3d(0, ${translateY}px, 0)`;

      if (Math.abs(nextProgress - progressRef.current) >= 0.002) {
        progressRef.current = nextProgress;
        setProgress(nextProgress);
      }
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScroll);
    };

    const onWidthChange = () => {
      const width = window.innerWidth;
      if (width === lastWidth && layoutLocked) return;
      lastWidth = width;
      lockLayout(true);
      updateScroll();
    };

    const onIntersect = (entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      // Measure when the stack is actually near the viewport (compact header +
      // current chrome), not at page load at the top.
      lockLayout(false);
      updateScroll();
    };

    const observer = new IntersectionObserver(onIntersect, {
      threshold: 0,
      rootMargin: '10% 0px 10% 0px',
    });
    observer.observe(track);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onWidthChange);
    window.addEventListener('orientationchange', onWidthChange);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onWidthChange);
      window.removeEventListener('orientationchange', onWidthChange);
    };
  }, [count, reducedMotion]);

  if (!categories?.length) return null;

  if (reducedMotion) {
    return (
      <div className="landing-features-mobile landing-features-mobile--static" aria-label="Funcionalidades do sistema">
        <header className="landing-features-mobile__head">
          <p className="landing-features__eyebrow">{landingFeaturesShowcase.eyebrow}</p>
          <h2 className="landing-features__title">
            <span className="landing-features__title-line">
              {landingFeaturesShowcase.titleBefore}
              <strong className="landing-features__highlight">{landingFeaturesShowcase.titleHighlight}</strong>
              {landingFeaturesShowcase.titleMid}
            </span>
            <span className="landing-features__title-line">{landingFeaturesShowcase.titleAfter}</span>
          </h2>
        </header>
        <div className="landing-features-mobile__stack">
          {categories.map((category) => (
            <FeatureMobileCard key={category.id} category={category} state="active" style={{}} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      className="landing-features-mobile"
      aria-label="Funcionalidades do sistema"
      style={{ '--features-card-count': count }}
    >
      <div ref={pinRef} className="landing-features-mobile__pin">
        <header className="landing-features-mobile__head">
          <p className="landing-features__eyebrow">{landingFeaturesShowcase.eyebrow}</p>
          <h2 className="landing-features__title">
            <span className="landing-features__title-line">
              {landingFeaturesShowcase.titleBefore}
              <strong className="landing-features__highlight">{landingFeaturesShowcase.titleHighlight}</strong>
              {landingFeaturesShowcase.titleMid}
            </span>
            <span className="landing-features__title-line">{landingFeaturesShowcase.titleAfter}</span>
          </h2>
        </header>

        <div className="landing-features-mobile__stage" aria-live="polite">
          {categories.map((category, index) => (
            <FeatureMobileCard
              key={category.id}
              category={category}
              state={cardVisualState(index, current, advance)}
              style={cardVisualStyle(index, current, advance, count)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
