'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import LandingIcon from '@/components/landing/LandingIcons';
import LandingReveal from '@/components/landing/LandingReveal';
import LandingScreenshot from '@/components/landing/LandingScreenshot';

const TIMELINE_DURATION_MS = 2800;

function measureTimeline(stepsEl, nodeEls) {
  if (!stepsEl || nodeEls.length < 2) return null;

  const stepsRect = stepsEl.getBoundingClientRect();
  const centers = nodeEls.map((el) => {
    const rect = el.getBoundingClientRect();
    return rect.top + rect.height / 2 - stepsRect.top;
  });

  const trackTop = centers[0];
  const trackHeight = Math.max(centers[centers.length - 1] - centers[0], 1);
  const nodeDelays = centers.map((center, index) => {
    const progress = (center - centers[0]) / trackHeight;
    if (index === 0) return Math.round(TIMELINE_DURATION_MS * 0.05);
    return Math.round(progress * TIMELINE_DURATION_MS);
  });

  return {
    trackTop,
    trackHeight,
    nodeDelays,
  };
}

export default function LandingSolutionsTimeline({ items = [] }) {
  const rootRef = useRef(null);
  const stepsRef = useRef(null);
  const nodeRefs = useRef([]);
  const [active, setActive] = useState(false);
  const [timeline, setTimeline] = useState(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setActive(true);
        if (prefersReduced) {
          setTimeline({ reduced: true, nodeDelays: items.map(() => 0) });
        }
      },
      { threshold: 0.28, rootMargin: '0px 0px -6% 0px' }
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, [items.length]);

  useLayoutEffect(() => {
    if (!active || timeline) return;

    const stepsEl = stepsRef.current;
    const nodeEls = nodeRefs.current.filter(Boolean);
    const metrics = measureTimeline(stepsEl, nodeEls);

    if (!metrics) return;
    setTimeline(metrics);
  }, [active, timeline, items.length]);

  const timelineStyle =
    timeline && !timeline.reduced
      ? {
          '--timeline-track-top': `${timeline.trackTop}px`,
          '--timeline-track-height': `${timeline.trackHeight}px`,
          '--timeline-duration': `${TIMELINE_DURATION_MS}ms`,
        }
      : undefined;

  const playTimeline = active && timeline && !timeline.reduced;

  return (
    <div
      ref={rootRef}
      className={`landing-solutions${active ? ' landing-solutions--active' : ''}${playTimeline ? ' landing-solutions--play' : ''}${timeline?.reduced ? ' landing-solutions--reduced' : ''}`}
    >
      <LandingReveal delay={80} className="landing-solutions__visual">
        <LandingScreenshot
          src="/images/mascote-esquerda.png"
          alt="Mascote Nimbus"
          className="landing-solutions__mascot"
        />
      </LandingReveal>

      <div className="landing-solutions__timeline-wrap" style={timelineStyle}>
        <div className="landing-solutions-timeline" aria-hidden="true">
          <div className="landing-solutions-timeline__track">
            <div className="landing-solutions-timeline__track-base" />
            <div className="landing-solutions-timeline__track-fill" />
            <div className="landing-solutions-timeline__track-dot" />
          </div>
        </div>

        <ol className="landing-solutions__steps" ref={stepsRef}>
          {items.map((item, index) => (
            <LandingReveal
              key={item.title}
              as="li"
              delay={120 + index * 90}
              className="landing-solutions__step"
              style={
                timeline?.nodeDelays
                  ? { '--node-activate-delay': `${timeline.nodeDelays[index]}ms` }
                  : undefined
              }
            >
              <div
                className="landing-solutions__node"
                aria-hidden="true"
                ref={(el) => {
                  nodeRefs.current[index] = el;
                }}
              >
                <span className="landing-solutions__node-ring" />
                <span className="landing-solutions__node-core">{index + 1}</span>
              </div>
              <article className="landing-glass-card landing-step-card landing-interactive landing-solutions__card">
                <LandingIcon name={item.icon} className="landing-step-card__icon" />
                <div className="landing-solutions__card-copy">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            </LandingReveal>
          ))}
        </ol>
      </div>
    </div>
  );
}
