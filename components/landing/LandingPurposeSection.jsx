'use client';

import Image from 'next/image';
import LandingIcon from '@/components/landing/LandingIcons';
import LandingReveal, { LandingRevealGroup } from '@/components/landing/LandingReveal';
import LandingScene from '@/components/landing/LandingScene';
import { landingPurpose } from '@/lib/landing/content';

function CardDescription({ card }) {
  if (card.description) {
    return <p className="landing-purpose__card-text">{card.description}</p>;
  }

  return (
    <p className="landing-purpose__card-text">
      {card.descriptionBefore}
      <strong>{card.descriptionBold}</strong>
      {card.descriptionAfter}
    </p>
  );
}

function CardVisual({ card }) {
  if (card.id === 'honesto') {
    return (
      <div className="landing-purpose__card-visual landing-purpose__card-visual--honesto">
        <Image
          className="landing-purpose__honesto-bg"
          src={card.piggyImage}
          alt=""
          width={640}
          height={400}
          sizes="(max-width: 720px) 90vw, 360px"
          aria-hidden="true"
        />
        <div className="landing-purpose__honesto-content">
          <div className="landing-purpose__bullets-card landing-glass-card landing-glass-card--edged">
            <span className="landing-glass-edge" aria-hidden="true" />
            <ul className="landing-purpose__bullets">
              {card.bullets.map((item) => (
                <li key={item}>
                  <span className="landing-purpose__bullet-check" aria-hidden="true">
                    <LandingIcon name="check" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <Image
            className="landing-purpose__mascot"
            src={card.mascotImage}
            alt={card.mascotAlt}
            width={280}
            height={280}
            sizes="220px"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`landing-purpose__card-visual landing-purpose__card-visual--${card.id}`}>
      <Image
        className="landing-purpose__visual-image"
        src={card.image}
        alt={card.imageAlt}
        width={640}
        height={720}
        sizes="(max-width: 720px) 90vw, 360px"
      />
    </div>
  );
}

export default function LandingPurposeSection() {
  return (
    <LandingScene id="proposito" className="landing-section-scene landing-purpose-scene">
      <div className="landing-container landing-purpose">
        <LandingRevealGroup step={200}>
          <LandingReveal className="landing-purpose__head">
            <p className="landing-purpose__eyebrow">{landingPurpose.eyebrow}</p>
            <h2 className="landing-purpose__title">
              {landingPurpose.titleBefore}
              <br />
              <span className="landing-purpose__highlight">{landingPurpose.titleHighlight}</span>
            </h2>
            <p className="landing-purpose__lead">{landingPurpose.lead}</p>
          </LandingReveal>

          <div className="landing-purpose__grid">
            {landingPurpose.cards.map((card) => (
              <LandingReveal key={card.id}>
                <article className="landing-purpose__card landing-glass-card">
                  <span className="landing-purpose__card-icon landing-glass-card landing-glass-card--edged" aria-hidden="true">
                    <span className="landing-glass-edge" />
                    <LandingIcon name={card.icon} />
                  </span>
                  <h3 className="landing-purpose__card-title">{card.title}</h3>
                  <CardDescription card={card} />
                  <CardVisual card={card} />
                </article>
              </LandingReveal>
            ))}
          </div>

          <LandingReveal className="landing-purpose__banner landing-glass-card">
            <LandingIcon name="sparkle" className="landing-purpose__banner-sparkle" />
            <div className="landing-purpose__banner-copy">
              <p className="landing-purpose__banner-line1">
                {landingPurpose.bannerLine1Before}
                <strong>{landingPurpose.bannerLine1Bold}</strong>
              </p>
              <p className="landing-purpose__banner-line2">
                {landingPurpose.bannerLine2Parts.map((part, index) => (
                  <span key={part} className="landing-purpose__banner-part">
                    {index > 0 ? (
                      <span className="landing-purpose__banner-dot" aria-hidden="true">
                        •
                      </span>
                    ) : null}
                    {part}
                  </span>
                ))}
              </p>
            </div>
          </LandingReveal>
        </LandingRevealGroup>
      </div>
    </LandingScene>
  );
}
