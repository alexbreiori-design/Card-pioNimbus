'use client';

import LandingReveal from '@/components/landing/LandingReveal';
import LandingScreenshot from '@/components/landing/LandingScreenshot';

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="landing-check-icon">
      <path
        d="M4.5 10.2 8 13.6 15.5 6.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LandingFeaturesGrid({ features = [] }) {
  return (
    <div className="landing-features-grid">
      {features.map((feature, index) => (
        <LandingReveal
          key={feature.id}
          delay={index * 120}
          className="landing-feature-card"
        >
          <div className="landing-feature-card__visual">
            <LandingScreenshot
              src={feature.image}
              alt={feature.imageAlt}
              placeholder={feature.placeholder}
              framed
            />
          </div>
          <div className="landing-feature-card__body landing-glass-card landing-interactive">
            <h3 className="landing-feature-card__title">{feature.title}</h3>
            <p className="landing-feature-card__text">{feature.text}</p>
            <ul className="landing-feature-card__list">
              {feature.bullets.map((bullet) => (
                <li key={bullet}>
                  <CheckIcon />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </LandingReveal>
      ))}
    </div>
  );
}
