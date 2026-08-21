'use client';

import { useEffect, useRef } from 'react';
import LandingIcon from '@/components/landing/LandingIcons';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';
import { landingFeaturesShowcase } from '@/lib/landing/content';

function FeatureMobileMedia({ category }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local showcase prints; graceful 404 fallback
    <img
      className="landing-features-mobile__image"
      src={category.image}
      alt={category.imageAlt}
      loading="lazy"
      decoding="async"
      onError={(event) => {
        event.currentTarget.style.display = 'none';
        const placeholder = event.currentTarget.nextElementSibling;
        if (placeholder) placeholder.hidden = false;
      }}
    />
  );
}

function FeatureMobileCard({ category, cardRef }) {
  return (
    <article
      ref={cardRef}
      className={`landing-features-mobile__card landing-glass-card landing-glass-card--edged landing-features-mobile__card--${category.tone}`}
      data-state="waiting"
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
        <div className="landing-features-mobile__placeholder" aria-hidden="true" hidden>
          <LandingIcon name={category.icon} />
          <span>{category.title}</span>
        </div>
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

function applyCardVisual(el, index, current, advance, total) {
  if (!el) return;

  let state = 'waiting';
  let opacity = 0;
  let transform = 'translate3d(0, 105%, 0)';
  let zIndex = index + 1;
  let pointerEvents = 'none';

  if (index < current) {
    const depth = current - index;
    state = 'stacked';
    opacity = Math.max(0.4, 1 - depth * 0.18);
    transform = `translate3d(0, 0, 0) scale(${Math.max(0.92, 1 - depth * 0.035)})`;
    pointerEvents = '';
  } else if (index === current) {
    state = advance > 0.02 ? 'covered' : 'active';
    opacity = 1;
    transform = `translate3d(0, 0, 0) scale(${1 - 0.03 * advance})`;
    pointerEvents = '';
  } else if (index === current + 1) {
    state = 'incoming';
    opacity = 1;
    transform = `translate3d(0, ${(1 - advance) * 100}%, 0)`;
    zIndex = total + 2;
    pointerEvents = '';
  }

  if (el.dataset.state !== state) {
    el.dataset.state = state;
    el.setAttribute('aria-hidden', state === 'waiting' ? 'true' : 'false');
    el.classList.toggle('is-waiting', state === 'waiting');
    el.classList.toggle('is-active', state === 'active');
    el.classList.toggle('is-covered', state === 'covered');
    el.classList.toggle('is-incoming', state === 'incoming');
    el.classList.toggle('is-stacked', state === 'stacked');
  }

  el.style.zIndex = String(zIndex);
  el.style.opacity = String(opacity);
  el.style.transform = transform;
  el.style.pointerEvents = pointerEvents;
}

/**
 * Sticky nativo (CSS) para o título + painel.
 * O JS só atualiza a pilha de cards — nunca move o pin com transform
 * (era isso que “pulava” no celular real).
 */
export default function LandingFeaturesMobile() {
  const { categories } = landingFeaturesShowcase;
  const reducedMotion = usePrefersReducedMotion();
  const trackRef = useRef(null);
  const cardsRef = useRef([]);
  const progressRef = useRef(0);
  const layoutRef = useRef({ headerBottom: 64 });

  const count = categories?.length || 0;

  useEffect(() => {
    if (reducedMotion || !count) return undefined;

    const track = trackRef.current;
    if (!track) return undefined;

    let frame = 0;
    let lastWidth = window.innerWidth;

    const syncHeaderOffset = () => {
      const headerBottom = measureHeaderBottom();
      track.style.setProperty('--features-header-offset', `${headerBottom}px`);
      layoutRef.current.headerBottom = headerBottom;
    };

    const paintCards = (progress) => {
      const scaled = progress * Math.max(1, count - 1);
      const current = Math.min(count - 1, Math.floor(scaled));
      const advance =
        current >= count - 1 ? 0 : Math.min(1, Math.max(0, scaled - current));

      for (let index = 0; index < count; index += 1) {
        applyCardVisual(cardsRef.current[index], index, current, advance, count);
      }
    };

    const updateScroll = () => {
      frame = 0;
      const pin = track.querySelector('.landing-features-mobile__pin');
      if (!pin) return;

      const { headerBottom } = layoutRef.current;
      const trackHeight = track.offsetHeight;
      const pinHeight = pin.offsetHeight;
      const maxTranslate = Math.max(0, trackHeight - pinHeight);
      if (maxTranslate <= 0) return;

      const rect = track.getBoundingClientRect();
      const scrolled = Math.min(Math.max(0, headerBottom - rect.top), maxTranslate);
      const nextProgress = Math.min(1, Math.max(0, scrolled / maxTranslate));

      if (Math.abs(nextProgress - progressRef.current) < 0.002) return;
      progressRef.current = nextProgress;
      paintCards(nextProgress);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScroll);
    };

    const onResize = () => {
      const width = window.innerWidth;
      if (width === lastWidth) {
        // Só o offset do header (barra do browser) — altura do pin é CSS/dvh
        syncHeaderOffset();
        updateScroll();
        return;
      }
      lastWidth = width;
      syncHeaderOffset();
      updateScroll();
    };

    paintCards(0);
    syncHeaderOffset();
    updateScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.visualViewport?.addEventListener('resize', onResize);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
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
            <FeatureMobileCard key={category.id} category={category} />
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
      <div className="landing-features-mobile__pin">
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
              cardRef={(node) => {
                cardsRef.current[index] = node;
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
