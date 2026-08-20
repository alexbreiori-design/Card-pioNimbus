'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import LandingFeaturesCatalogModal from '@/components/landing/LandingFeaturesCatalogModal';
import LandingFeaturesMobile from '@/components/landing/LandingFeaturesMobile';
import LandingIcon from '@/components/landing/LandingIcons';
import LandingReveal, { LandingRevealGroup } from '@/components/landing/LandingReveal';
import LandingScene from '@/components/landing/LandingScene';
import { landingFeaturesShowcase } from '@/lib/landing/content';

const MEDIA_SLIDE = 52;
const STRIP_STAGGER = 0.075;
const EASE_OUT = [0.22, 1, 0.36, 1];

function stripItemMotion(index, reducedMotion) {
  if (reducedMotion) {
    return {
      initial: false,
      animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    };
  }

  const enterDelay = 0.02 + index * STRIP_STAGGER;

  return {
    initial: { opacity: 0, y: 14, filter: 'blur(4px)' },
    animate: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.42, delay: enterDelay, ease: EASE_OUT },
    },
  };
}

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

function FeatureMediaPanel({ category, direction, reducedMotion }) {
  const offset = reducedMotion ? 0 : MEDIA_SLIDE * direction;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={category.id}
        className="landing-features-showcase__media-slide"
        initial={{ opacity: 0, y: offset }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -offset }}
        transition={{ duration: reducedMotion ? 0.01 : 0.48, ease: EASE_OUT }}
      >
        <FeatureMedia category={category} />
      </motion.div>
    </AnimatePresence>
  );
}

function FeatureStrip({ category, reducedMotion }) {
  const shellTransition = reducedMotion
    ? { duration: 0.01 }
    : { duration: 0.28, ease: [0.4, 0, 0.2, 1] };

  return (
    <div className={`landing-features-showcase__strip landing-glass-card landing-features-showcase__strip--${category.tone}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={category.id}
          className="landing-features-showcase__strip-content"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          transition={shellTransition}
        >
          <motion.div
            {...stripItemMotion(0, reducedMotion)}
            className={`landing-features-showcase__strip-icon landing-features-showcase__strip-icon--${category.tone}`}
            aria-hidden="true"
          >
            <LandingIcon name={category.icon} />
          </motion.div>

          <motion.h3 {...stripItemMotion(1, reducedMotion)} className="landing-features-showcase__strip-title">
            {category.title}
          </motion.h3>

          <motion.p {...stripItemMotion(2, reducedMotion)} className="landing-features-showcase__strip-desc">
            {category.description}
          </motion.p>

          <ul className="landing-features-showcase__chips">
            {category.chips.map((chip, chipIndex) => (
              <motion.li
                key={`${category.id}-${chip.label}`}
                {...stripItemMotion(3 + chipIndex, reducedMotion)}
                className="landing-features-showcase__chip"
              >
                <span
                  className={`landing-features-showcase__chip-icon landing-features-showcase__chip-icon--${category.tone}`}
                  aria-hidden="true"
                >
                  <LandingIcon name={chip.icon} />
                </span>
                <span>{chip.label}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function LandingFeaturesSection() {
  const { categories } = landingFeaturesShowcase;
  const reducedMotion = useReducedMotion();
  const [activeId, setActiveId] = useState(categories[0]?.id || 'venda-online');
  const [slideDirection, setSlideDirection] = useState(1);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const activeIndexRef = useRef(0);

  const active = categories.find((item) => item.id === activeId) || categories[0];

  if (!active) return null;

  const handleSelect = (id) => {
    const nextIndex = categories.findIndex((item) => item.id === id);
    if (nextIndex < 0 || nextIndex === activeIndexRef.current) return;
    setSlideDirection(nextIndex > activeIndexRef.current ? 1 : -1);
    activeIndexRef.current = nextIndex;
    setActiveId(id);
  };

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
                <FeatureMediaPanel category={active} direction={slideDirection} reducedMotion={reducedMotion} />
              </div>
            </div>

            <FeatureStrip category={active} reducedMotion={reducedMotion} />
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
