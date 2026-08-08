'use client';

import Image from 'next/image';
import Link from 'next/link';
import LandingAmbient from '@/components/landing/LandingAmbient';
import LandingFaq from '@/components/landing/LandingFaq';
import LandingFeaturesSection from '@/components/landing/LandingFeaturesSection';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingReveal from '@/components/landing/LandingReveal';
import LandingScene from '@/components/landing/LandingScene';
import LandingHeroDemo from '@/components/landing/LandingHeroDemo';
import LandingHeroTitle from '@/components/landing/LandingHeroTitle';
import LandingPainsSection from '@/components/landing/LandingPainsSection';
import LandingPurposeSection from '@/components/landing/LandingPurposeSection';
import LandingPricingSection from '@/components/landing/LandingPricingSection';
import { whatsappUrl } from '@/lib/landing/constants';
import {
  landingFaq,
  landingFooter,
  landingHero,
} from '@/lib/landing/content';

function WhatsAppButton({ className = '', children, message }) {
  return (
    <a className={className} href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-page">
      <LandingAmbient />
      <LandingHeader />

      <main>
        <LandingScene id="topo" className="landing-hero-scene">
          <div className="landing-container">
            <div className="landing-hero landing-hero--showcase">
              <div className="landing-hero__copy landing-hero__copy--center">
                <LandingReveal onLoad delay={0}>
                  <p className="landing-kicker">{landingHero.kicker}</p>
                </LandingReveal>
                <LandingReveal onLoad delay={90}>
                  <LandingHeroTitle
                    before={landingHero.titleBefore}
                    after={landingHero.titleAfter}
                    words={landingHero.titleWords}
                  />
                </LandingReveal>
                <LandingReveal onLoad delay={180}>
                  <p className="landing-lead landing-lead--showcase">{landingHero.lead}</p>
                </LandingReveal>
              </div>

              <LandingReveal onLoad delay={220} className="landing-hero__demo-wrap">
                <LandingHeroDemo
                  calloutTitle={landingHero.calloutTitle}
                  calloutSub={landingHero.calloutSub}
                  closeLabel={landingHero.demoClose}
                />
              </LandingReveal>

              <LandingReveal onLoad delay={300} className="landing-hero__actions landing-hero__actions--center landing-hero__actions--below">
                <WhatsAppButton className="landing-btn landing-btn--primary landing-btn--lg landing-interactive">
                  Quero meu cardápio
                </WhatsAppButton>
                <a href="#proposito" className="landing-btn landing-btn--soft landing-btn--lg landing-interactive">
                  Ver como funciona
                </a>
              </LandingReveal>
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

        <LandingScene id="faq" className="landing-section-scene">
          <div className="landing-container landing-faq-wrap">
            <LandingReveal delay={0} className="landing-section-head landing-section-head--center">
              <h2 className="landing-section-title">Perguntas frequentes</h2>
            </LandingReveal>
            <LandingReveal delay={80}>
              <LandingFaq items={landingFaq} />
            </LandingReveal>
          </div>
        </LandingScene>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer__grid">
          <div className="landing-footer__brand">
            <Image
              src="/images/logo-horizontal.png"
              alt="Cardápio Nimbus"
              width={128}
              height={32}
              className="landing-footer__logo"
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
    </div>
  );
}
