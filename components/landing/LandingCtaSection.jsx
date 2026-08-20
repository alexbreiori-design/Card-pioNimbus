'use client';

import LandingIcon from '@/components/landing/LandingIcons';
import LandingReveal from '@/components/landing/LandingReveal';
import LandingScene from '@/components/landing/LandingScene';
import { landingCta } from '@/lib/landing/content';
import { whatsappUrl } from '@/lib/landing/constants';

export default function LandingCtaSection() {
  return (
    <LandingScene className="landing-section-scene landing-cta-scene">
      <div className="landing-container">
        <LandingReveal>
          <div className="landing-cta-banner">
            <div className="landing-cta-banner__copy">
              <h2 className="landing-cta-banner__title">
                {landingCta.titleBefore}
                <strong>{landingCta.titleHighlight}</strong>
                {landingCta.titleAfter}
              </h2>
            </div>

            <a
              className="landing-cta-banner__btn"
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{landingCta.cta}</span>
              <LandingIcon name="chevronRight" />
            </a>
          </div>
        </LandingReveal>
      </div>
    </LandingScene>
  );
}
