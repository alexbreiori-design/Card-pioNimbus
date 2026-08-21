'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import LandingBootGate from '@/components/landing/LandingBootGate';
import LandingFaq from '@/components/landing/LandingFaq';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingIcon from '@/components/landing/LandingIcons';
import LandingReveal, { LandingRevealGroup } from '@/components/landing/LandingReveal';
import LandingScene from '@/components/landing/LandingScene';
import LandingHeroDemo from '@/components/landing/LandingHeroDemo';
import LandingHeroTitle from '@/components/landing/LandingHeroTitle';
import { whatsappUrl } from '@/lib/landing/constants';
import {
  landingFaq,
  landingFooter,
  landingHero,
} from '@/lib/landing/content';
import { landingFontVariables } from '@/lib/landing/fonts';

const LandingAmbient = dynamic(() => import('@/components/landing/LandingAmbient'), {
  ssr: false,
  loading: () => null,
});
const LandingPainsSection = dynamic(() => import('@/components/landing/LandingPainsSection'), {
  loading: () => null,
});
const LandingPurposeSection = dynamic(() => import('@/components/landing/LandingPurposeSection'), {
  loading: () => null,
});
const LandingFeaturesSection = dynamic(() => import('@/components/landing/LandingFeaturesSection'), {
  loading: () => null,
});
const LandingPricingSection = dynamic(() => import('@/components/landing/LandingPricingSection'), {
  loading: () => null,
});
const LandingCtaSection = dynamic(() => import('@/components/landing/LandingCtaSection'), {
  loading: () => null,
});

function WhatsAppButton({ className = '', children, message }) {
  return (
    <a className={className} href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export default function LandingPage() {
  return (
    <div className={`landing-page ${landingFontVariables}`}>
      <LandingBootGate>
        <LandingAmbient />
        <LandingHeader />

        <main>
          <LandingScene id="topo" className="landing-hero-scene">
            <div className="landing-container">
              <div className="landing-hero landing-hero--showcase">
                <LandingRevealGroup step={240} onLoad>
                  <div className="landing-hero__copy landing-hero__copy--center">
                    <LandingReveal>
                      <LandingHeroTitle
                        before={landingHero.titleBefore}
                        after={landingHero.titleAfter}
                        words={landingHero.titleWords}
                      />
                    </LandingReveal>
                    <LandingReveal>
                      <p className="landing-lead landing-lead--showcase">
                        {landingHero.lead.split('\n').map((line) => (
                          <span key={line} className="landing-lead__line">
                            {line}
                          </span>
                        ))}
                      </p>
                    </LandingReveal>
                  </div>

                  <LandingReveal className="landing-hero__demo-wrap">
                    <LandingHeroDemo
                      calloutTitle={landingHero.calloutTitle}
                      calloutSub={landingHero.calloutSub}
                      calloutSubMobile={landingHero.calloutSubMobile}
                      closeLabel={landingHero.demoClose}
                    />
                  </LandingReveal>

                  <LandingReveal className="landing-hero__demo-cta">
                    <a
                      className="landing-btn landing-btn--primary landing-hero__demo-cta-btn"
                      href={whatsappUrl(landingHero.demoCtaMessage)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <LandingIcon name="whatsapp" className="landing-hero__demo-cta-icon" />
                      <span>{landingHero.demoCta}</span>
                    </a>
                  </LandingReveal>
                </LandingRevealGroup>
              </div>
            </div>
          </LandingScene>

          <LandingPainsSection />

          <LandingPurposeSection />

          <LandingFeaturesSection />

          <LandingScene id="preco" className="landing-section-scene landing-pricing-scene">
            <div className="landing-container">
              <LandingPricingSection />
            </div>
          </LandingScene>

          <LandingCtaSection />

          <LandingScene id="faq" className="landing-section-scene">
            <div className="landing-container landing-faq-wrap">
              <LandingRevealGroup step={160}>
                <LandingReveal className="landing-section-head landing-section-head--center">
                  <h2 className="landing-section-title">Perguntas frequentes</h2>
                </LandingReveal>
                <LandingFaq items={landingFaq} />
              </LandingRevealGroup>
            </div>
          </LandingScene>
        </main>

        <footer className="landing-footer">
          <div className="landing-container landing-footer__grid">
            <div className="landing-footer__brand">
              <Image
                src="/images/logo-horizontal.webp"
                alt="Cardápio Nimbus"
                width={128}
                height={32}
                className="landing-footer__logo"
                quality={60}
              />
              <p>A Nimbus é a plataforma de cardápio digital feita para quem vive de delivery.</p>
              <WhatsAppButton className="landing-footer__whatsapp">+55 43 99122-3322</WhatsAppButton>
            </div>

            <div>
              <p className="landing-footer__title">Produto</p>
              <ul>
                {landingFooter.product.map((item) => (
                  <li key={item.label}>
                    <a href={item.href}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="landing-footer__title">Empresa</p>
              <ul>
                {landingFooter.company.map((item) => (
                  <li key={item.label}>
                    {item.href === 'whatsapp' ? (
                      <WhatsAppButton className="landing-footer__link-btn">{item.label}</WhatsAppButton>
                    ) : (
                      <Link href={item.href}>{item.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="landing-footer__title">Recursos</p>
              <ul>
                {landingFooter.resources.map((item) => (
                  <li key={item.label}>
                    <a href={item.href}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="landing-footer__title">Legal</p>
              <ul>
                {landingFooter.legal.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="landing-container landing-footer__bottom">
            <p>© {new Date().getFullYear()} Cardápio Nimbus. Todos os direitos reservados.</p>
          </div>
        </footer>
      </LandingBootGate>
    </div>
  );
}
