'use client';

import { useState } from 'react';
import LandingIcon from '@/components/landing/LandingIcons';
import LandingReveal, { LandingRevealGroup } from '@/components/landing/LandingReveal';
import LandingScene from '@/components/landing/LandingScene';
import { landingFeaturesShowcase } from '@/lib/landing/content';

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

export default function LandingFeaturesSection() {
  const { categories } = landingFeaturesShowcase;
  const [activeId, setActiveId] = useState(categories[0]?.id || 'venda-online');
  const active = categories.find((item) => item.id === activeId) || categories[0];

  if (!active) return null;

  return (
    <LandingScene id="recursos" className="landing-section-scene landing-features-scene">
      <div className="landing-container landing-features">
        <LandingRevealGroup step={150}>
          <LandingReveal className="landing-features__head">
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
                      onClick={() => setActiveId(category.id)}
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

            <LandingReveal
              id="landing-feature-panel"
              role="tabpanel"
              aria-labelledby={`landing-feature-tab-${active.id}`}
              className="landing-features-showcase__media"
            >
              <FeatureMedia key={active.id} category={active} />
            </LandingReveal>
          </div>

          <LandingReveal>
            <div className="landing-features-showcase__strip landing-glass-card">
              <div
                className={`landing-features-showcase__strip-icon landing-features-showcase__strip-icon--${active.tone}`}
                aria-hidden="true"
              >
                <LandingIcon name={active.icon} />
              </div>
              <div className="landing-features-showcase__strip-copy">
                <h3 className="landing-features-showcase__strip-title">{active.title}</h3>
                <p className="landing-features-showcase__strip-desc">{active.description}</p>
              </div>
              <ul className="landing-features-showcase__chips">
                {active.chips.map((chip) => (
                  <li key={chip.label} className="landing-features-showcase__chip">
                    <span className="landing-features-showcase__chip-icon" aria-hidden="true">
                      <LandingIcon name={chip.icon} />
                    </span>
                    <span>{chip.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </LandingReveal>

          <LandingReveal className="landing-features__footer">
            <p className="landing-features__footer-note">{landingFeaturesShowcase.footerNote}</p>
            <button type="button" className="landing-features__footer-cta landing-glass-card landing-interactive">
              <span>{landingFeaturesShowcase.footerCta}</span>
              <LandingIcon name="chevronRight" />
            </button>
          </LandingReveal>
        </LandingRevealGroup>
      </div>
    </LandingScene>
  );
}
