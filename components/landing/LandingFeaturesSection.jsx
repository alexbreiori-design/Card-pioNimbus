'use client';

import { useEffect, useRef, useState } from 'react';
import LandingFeaturesCatalogModal from '@/components/landing/LandingFeaturesCatalogModal';
import LandingFeaturesMobile from '@/components/landing/LandingFeaturesMobile';
import LandingIcon from '@/components/landing/LandingIcons';
import LandingReveal, { LandingRevealGroup } from '@/components/landing/LandingReveal';
import LandingScene from '@/components/landing/LandingScene';
import { landingFeaturesShowcase } from '@/lib/landing/content';

const MEDIA_SLIDE = 52;
const AUTO_ROTATE_MS = 10000;

function FeatureMedia({ category }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="landing-features-showcase__placeholder" aria-hidden="true">
        <LandingIcon name={category.icon} />
        <span>{category.title}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- local showcase prints; graceful 404 fallback
    <img
      className="landing-features-showcase__image"
      src={category.image}
      alt={category.imageAlt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

function FeatureMediaPanel({ category, direction }) {
  return (
    <div
      key={category.id}
      className="landing-features-showcase__media-slide"
      style={{ '--feature-slide-from': `${MEDIA_SLIDE * direction}px` }}
    >
      <FeatureMedia category={category} />
    </div>
  );
}

function FeatureStrip({ category }) {
  return (
    <div className={`landing-features-showcase__strip landing-glass-card landing-features-showcase__strip--${category.tone}`}>
      {/* key força remontagem: a entrada em escadinha roda por CSS */}
      <div key={category.id} className="landing-features-showcase__strip-content">
        <div
          className={`landing-features-showcase__strip-icon landing-features-showcase__strip-icon--${category.tone}`}
          aria-hidden="true"
        >
          <LandingIcon name={category.icon} />
        </div>

        <h3 className="landing-features-showcase__strip-title">{category.title}</h3>

        <p className="landing-features-showcase__strip-desc">{category.description}</p>

        <ul className="landing-features-showcase__chips">
          {category.chips.map((chip) => (
            <li key={`${category.id}-${chip.label}`} className="landing-features-showcase__chip">
              <span
                className={`landing-features-showcase__chip-icon landing-features-showcase__chip-icon--${category.tone}`}
                aria-hidden="true"
              >
                <LandingIcon name={chip.icon} />
              </span>
              <span>{chip.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function LandingFeaturesSection() {
  const { categories } = landingFeaturesShowcase;
  const [activeId, setActiveId] = useState(categories[0]?.id || 'venda-online');
  const [slideDirection, setSlideDirection] = useState(1);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const activeIndexRef = useRef(0);

  const active = categories.find((item) => item.id === activeId) || categories[0];

  const handleSelect = (id) => {
    const nextIndex = categories.findIndex((item) => item.id === id);
    if (nextIndex < 0 || nextIndex === activeIndexRef.current) return;
    setSlideDirection(nextIndex > activeIndexRef.current ? 1 : -1);
    activeIndexRef.current = nextIndex;
    setActiveId(id);
  };

  // Desktop: avança sozinho a cada 10s (pausa com modal aberto ou reduced-motion)
  useEffect(() => {
    if (!categories?.length || catalogOpen) return undefined;
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (!window.matchMedia('(min-width: 721px)').matches) return undefined;

    const timer = window.setInterval(() => {
      const nextIndex = (activeIndexRef.current + 1) % categories.length;
      setSlideDirection(1);
      activeIndexRef.current = nextIndex;
      setActiveId(categories[nextIndex].id);
    }, AUTO_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [categories, catalogOpen, activeId]);

  if (!active) return null;

  return (
    <LandingScene id="recursos" className="landing-section-scene landing-features-scene">
      <div className="landing-container landing-features">
        <LandingRevealGroup step={150}>
          <LandingReveal className="landing-features__head landing-features__head--desktop">
            <p className="landing-features__eyebrow">{landingFeaturesShowcase.eyebrow}</p>
            <h2 className="landing-features__title">
              <span className="landing-features__title-line">
                {landingFeaturesShowcase.titleBefore}
                <strong className="landing-features__highlight">{landingFeaturesShowcase.titleHighlight}</strong>
                {landingFeaturesShowcase.titleMid}
              </span>
              <span className="landing-features__title-line">{landingFeaturesShowcase.titleAfter}</span>
            </h2>
          </LandingReveal>

          <div className="landing-features-desktop">
            <div className="landing-features-showcase">
              <div className="landing-features-showcase__nav" role="tablist" aria-label="Áreas do sistema">
                {categories.map((category) => {
                  const isActive = category.id === active.id;
                  return (
                    <LandingReveal key={category.id}>
                      <button
                        type="button"
                        role="tab"
                        id={`landing-feature-tab-${category.id}`}
                        aria-selected={isActive}
                        aria-controls="landing-feature-panel"
                        className={`landing-features-showcase__item landing-glass-card landing-glass-card--edged${isActive ? ` is-active is-active--${category.tone}` : ''}`}
                        onClick={() => handleSelect(category.id)}
                      >
                        <span className="landing-glass-edge" aria-hidden="true" />
                        <span
                          className={`landing-features-showcase__item-icon landing-features-showcase__item-icon--${category.tone}`}
                          aria-hidden="true"
                        >
                          <LandingIcon name={category.icon} />
                        </span>
                        <span className="landing-features-showcase__item-copy">
                          <span className="landing-features-showcase__item-title">{category.title}</span>
                          <span className="landing-features-showcase__item-desc">{category.summary}</span>
                        </span>
                        <LandingIcon name="chevronRight" className="landing-features-showcase__item-chevron" />
                      </button>
                    </LandingReveal>
                  );
                })}
              </div>

              <div
                id="landing-feature-panel"
                role="tabpanel"
                aria-labelledby={`landing-feature-tab-${active.id}`}
                className="landing-features-showcase__media"
              >
                <FeatureMediaPanel category={active} direction={slideDirection} />
              </div>
            </div>

            <FeatureStrip category={active} />
          </div>

          <LandingFeaturesMobile />

          <LandingReveal className="landing-features__footer">
            <p className="landing-features__footer-note">{landingFeaturesShowcase.footerNote}</p>
            <button
              type="button"
              className="landing-features__footer-cta landing-glass-card landing-interactive"
              onClick={() => setCatalogOpen(true)}
            >
              <span>{landingFeaturesShowcase.footerCta}</span>
              <LandingIcon name="chevronRight" />
            </button>
          </LandingReveal>
        </LandingRevealGroup>
      </div>

      <LandingFeaturesCatalogModal open={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </LandingScene>
  );
}
