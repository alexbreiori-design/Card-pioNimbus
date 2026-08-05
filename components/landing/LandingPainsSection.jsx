'use client';

import Image from 'next/image';
import LandingIcon from '@/components/landing/LandingIcons';
import LandingReveal from '@/components/landing/LandingReveal';
import LandingScene from '@/components/landing/LandingScene';
import { landingPains } from '@/lib/landing/content';

export default function LandingPainsSection() {
  const { reality } = landingPains;

  return (
    <LandingScene id="dores" className="landing-section-scene landing-truth-scene">
      <div className="landing-container landing-truth">
        <div className="landing-truth__intro">
          <LandingReveal delay={0} className="landing-truth__copy">
            <p className="landing-truth__eyebrow">{landingPains.eyebrow}</p>
            <h2 className="landing-truth__title">
              {landingPains.titleLine1}
              <br />
              {landingPains.titleLine2Before}
              <span className="landing-truth__highlight">{landingPains.titleHighlight}</span>
              {landingPains.titleLine2After}
              <br />
              {landingPains.titleLine3}
            </h2>
            <p className="landing-truth__body">{landingPains.body}</p>
            <p className="landing-truth__emphasis">{landingPains.emphasis}</p>
          </LandingReveal>

          <LandingReveal delay={120} className="landing-truth__visual">
            <div className="landing-truth__mascot-wrap">
              <Image
                className="landing-truth__mascot"
                src={landingPains.mascotSrc}
                alt={landingPains.mascotAlt}
                width={520}
                height={640}
                sizes="(max-width: 720px) 50vw, 385px"
                priority={false}
              />
              {landingPains.bubbles.map((bubble, index) => (
                <div
                  key={bubble.text}
                  className={`landing-truth__bubble landing-glass-card landing-glass-card--edged landing-truth__bubble--${index + 1} landing-truth__bubble--${bubble.tone}`}
                >
                  <div className="landing-glass-edge" aria-hidden="true" />
                  <span className="landing-truth__bubble-icon" aria-hidden="true">
                    <LandingIcon name={bubble.icon} />
                  </span>
                  <p>{bubble.text}</p>
                </div>
              ))}
            </div>
          </LandingReveal>
        </div>

        <LandingReveal delay={160} className="landing-truth__panel landing-glass-card landing-glass-card--edged">
          <div className="landing-glass-edge" aria-hidden="true" />
          <div className="landing-truth__panel-head">
            <p className="landing-truth__eyebrow landing-truth__eyebrow--center">{reality.eyebrow}</p>
            <h2 className="landing-truth__panel-title">{reality.title}</h2>
            <p className="landing-truth__panel-lead">{reality.lead}</p>
          </div>

          <div className="landing-truth__challenges">
            {reality.challenges.map((item) => (
              <article key={item.title} className={`landing-truth__challenge landing-truth__challenge--${item.tone}`}>
                <span className="landing-truth__challenge-icon" aria-hidden="true">
                  <LandingIcon name={item.icon} />
                </span>
                <h3 className="landing-truth__challenge-title">{item.title}</h3>
                <p className="landing-truth__challenge-text">{item.text}</p>
              </article>
            ))}
          </div>

          <div className="landing-truth__banner">
            <span className="landing-truth__banner-icon" aria-hidden="true">
              <LandingIcon name="star" />
            </span>
            <p className="landing-truth__banner-text">
              <strong>{reality.bannerBold}</strong>
              {reality.bannerRest}
            </p>
          </div>
        </LandingReveal>
      </div>
    </LandingScene>
  );
}
