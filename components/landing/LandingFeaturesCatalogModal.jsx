'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import LandingIcon from '@/components/landing/LandingIcons';
import { whatsappUrl } from '@/lib/landing/constants';
import { landingFeaturesCatalog } from '@/lib/landing/content';

export default function LandingFeaturesCatalogModal({ open = false, onClose }) {
  const titleId = useId();
  const closeRef = useRef(null);
  const bodyRef = useRef(null);
  const pillsRef = useRef(null);
  const pillButtonRefs = useRef({});
  const skippingObserverRef = useRef(false);
  const { title, closeLabel, ctaLabel, groups } = landingFeaturesCatalog;
  const defaultId = groups[0]?.id || '';
  const [activeId, setActiveId] = useState(defaultId);
  const [prevOpen, setPrevOpen] = useState(open);
  const [pillsCanScrollMore, setPillsCanScrollMore] = useState(false);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setActiveId(defaultId);
      setPillsCanScrollMore(false);
    }
  }

  const updatePillsOverflow = useCallback(() => {
    const pills = pillsRef.current;
    if (!pills) {
      setPillsCanScrollMore(false);
      return;
    }
    const remaining = pills.scrollWidth - pills.clientWidth - pills.scrollLeft;
    setPillsCanScrollMore(remaining > 8);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    skippingObserverRef.current = false;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);
    const focusTimer = window.requestAnimationFrame(() => {
      closeRef.current?.focus();
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
      if (pillsRef.current) pillsRef.current.scrollLeft = 0;
      updatePillsOverflow();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.cancelAnimationFrame(focusTimer);
    };
  }, [open, onClose, updatePillsOverflow]);

  useEffect(() => {
    if (!open) return undefined;

    const pills = pillsRef.current;
    if (!pills) return undefined;

    updatePillsOverflow();
    pills.addEventListener('scroll', updatePillsOverflow, { passive: true });
    window.addEventListener('resize', updatePillsOverflow);

    return () => {
      pills.removeEventListener('scroll', updatePillsOverflow);
      window.removeEventListener('resize', updatePillsOverflow);
    };
  }, [open, updatePillsOverflow]);

  useEffect(() => {
    if (!open) return undefined;

    const body = bodyRef.current;
    if (!body) return undefined;

    const sections = Array.from(body.querySelectorAll('[data-catalog-group]'));
    if (!sections.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (skippingObserverRef.current) return;

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!visible.length) return;

        const nextId = visible[0].target.getAttribute('data-catalog-group');
        if (nextId) setActiveId(nextId);
      },
      {
        root: body,
        threshold: [0.2, 0.35, 0.5, 0.65],
        rootMargin: '-12% 0px -48% 0px',
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [open, groups]);

  useEffect(() => {
    if (!open || !activeId) return undefined;

    const pill = pillButtonRefs.current[activeId];
    const pills = pillsRef.current;
    if (!pill || !pills) return undefined;

    const pillsRect = pills.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();
    const delta =
      pillRect.left + pillRect.width / 2 - (pillsRect.left + pillsRect.width / 2);

    if (Math.abs(delta) > 2) {
      pills.scrollTo({ left: pills.scrollLeft + delta, behavior: 'smooth' });
    }

    const timer = window.setTimeout(updatePillsOverflow, 320);
    return () => window.clearTimeout(timer);
  }, [activeId, open, updatePillsOverflow]);

  const scrollToGroup = (groupId) => {
    const root = bodyRef.current;
    if (!root) return;
    const target = root.querySelector(`#catalog-group-${groupId}`);
    if (!target) return;

    setActiveId(groupId);
    skippingObserverRef.current = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      skippingObserverRef.current = false;
    }, 520);
  };

  const scrollPillsForward = () => {
    const pills = pillsRef.current;
    if (!pills) return;

    const pillsRect = pills.getBoundingClientRect();
    const centerX = pillsRect.left + pillsRect.width / 2;
    const buttons = Array.from(pills.querySelectorAll('.landing-features-catalog__pill'));
    const next =
      buttons.find((btn) => {
        const rect = btn.getBoundingClientRect();
        return rect.left + rect.width / 2 > centerX + 10;
      }) || buttons[buttons.length - 1];

    if (!next) return;

    const nextRect = next.getBoundingClientRect();
    const delta = nextRect.left + nextRect.width / 2 - centerX;
    pills.scrollTo({ left: pills.scrollLeft + delta, behavior: 'smooth' });
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="landing-features-catalog" role="presentation">
      <button
        type="button"
        className="landing-features-catalog__backdrop"
        aria-label={closeLabel}
        onClick={onClose}
      />

      <div
        className="landing-features-catalog__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="landing-features-catalog__header">
          <h2 id={titleId} className="landing-features-catalog__title">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="landing-features-catalog__close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <LandingIcon name="close" />
          </button>
        </header>

        <div
          className={`landing-features-catalog__pills-rail${pillsCanScrollMore ? ' has-more' : ''}`}
        >
          <div ref={pillsRef} className="landing-features-catalog__pills" role="navigation" aria-label="Áreas do sistema">
            {groups.map((group) => {
              const isActive = group.id === activeId;
              return (
                <button
                  key={group.id}
                  ref={(node) => {
                    pillButtonRefs.current[group.id] = node;
                  }}
                  type="button"
                  className={`landing-features-catalog__pill landing-features-catalog__pill--${group.tone}${
                    isActive ? ' is-selected' : ''
                  }`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => scrollToGroup(group.id)}
                >
                  <span className="landing-features-catalog__pill-icon" aria-hidden="true">
                    <LandingIcon name={group.icon} />
                  </span>
                  <span>{group.title}</span>
                </button>
              );
            })}
          </div>

          <div className="landing-features-catalog__pills-fade" aria-hidden="true" />

          {pillsCanScrollMore ? (
            <button
              type="button"
              className="landing-features-catalog__pills-next"
              aria-label="Ver mais categorias"
              onClick={scrollPillsForward}
            >
              <LandingIcon name="chevronRight" />
            </button>
          ) : null}
        </div>

        <div ref={bodyRef} className="landing-features-catalog__body">
          {groups.map((group) => (
            <section
              key={group.id}
              id={`catalog-group-${group.id}`}
              data-catalog-group={group.id}
              className={`landing-features-catalog__group landing-features-catalog__group--${group.tone}`}
            >
              <div className="landing-features-catalog__group-head">
                <span
                  className={`landing-features-catalog__group-icon landing-features-catalog__group-icon--${group.tone}`}
                  aria-hidden="true"
                >
                  <LandingIcon name={group.icon} />
                </span>
                <div className="landing-features-catalog__group-copy">
                  <h3 className="landing-features-catalog__group-title">{group.title}</h3>
                  <p className="landing-features-catalog__group-summary">{group.summary}</p>
                </div>
              </div>

              <ul className="landing-features-catalog__list">
                {group.items.map((item) => (
                  <li key={`${group.id}-${item.label}`} className="landing-features-catalog__item">
                    <span
                      className={`landing-features-catalog__item-icon landing-features-catalog__item-icon--${group.tone}`}
                      aria-hidden="true"
                    >
                      <LandingIcon name={item.icon} />
                    </span>
                    <span className="landing-features-catalog__item-label">{item.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="landing-features-catalog__footer">
          <a
            className="landing-btn landing-btn--primary landing-features-catalog__cta"
            href={whatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            <LandingIcon name="whatsapp" />
            <span>{ctaLabel}</span>
          </a>
        </footer>
      </div>
    </div>,
    document.body
  );
}
