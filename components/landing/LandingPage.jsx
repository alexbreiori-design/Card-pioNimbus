'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import LandingFeaturesGrid from '@/components/landing/LandingFeaturesGrid';
import LandingAmbient from '@/components/landing/LandingAmbient';
import LandingFaq from '@/components/landing/LandingFaq';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingIcon from '@/components/landing/LandingIcons';
import LandingReveal from '@/components/landing/LandingReveal';
import LandingScene from '@/components/landing/LandingScene';
import LandingHeroDemo from '@/components/landing/LandingHeroDemo';
import LandingHeroTitle from '@/components/landing/LandingHeroTitle';
import LandingPainsSection from '@/components/landing/LandingPainsSection';
import LandingPurposeSection from '@/components/landing/LandingPurposeSection';
import LandingPricingSection from '@/components/landing/LandingPricingSection';
import LandingStatsRow from '@/components/landing/LandingStatsRow';
import { NIMBUS_DEMO_SLUG, whatsappUrl } from '@/lib/landing/constants';
import { getStorePublicUrl } from '@/lib/siteUrl';
import {
  landingCta,
  landingFaq,
  landingFeaturesAll,
  landingFeaturesMain,
  landingFooter,
  landingHero,
  landingStats,
  landingTestimonials,
} from '@/lib/landing/content';

function WhatsAppButton({ className = '', children, message }) {
  return (
    <a className={className} href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

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

export default function LandingPage() {
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const featuredTestimonial = landingTestimonials.find((item) => item.featured) || landingTestimonials[0];
  const otherTestimonials = landingTestimonials.filter((item) => !item.featured);

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

        <LandingScene id="recursos" className="landing-section-scene">
          <div className="landing-container">
            <LandingReveal delay={0} className="landing-section-head landing-section-head--center">
              <h2 className="landing-section-title">Tudo o que sua loja precisa</h2>
              <p className="landing-section-lead">Recursos que quem vive de delivery usa de verdade.</p>
            </LandingReveal>

            <LandingFeaturesGrid features={landingFeaturesMain} />

            <LandingReveal delay={480} className="landing-features-expand">
              <button
                type="button"
                className="landing-features-expand__trigger landing-interactive"
                aria-expanded={showAllFeatures}
                onClick={() => setShowAllFeatures((value) => !value)}
              >
                <span>{showAllFeatures ? 'Ocultar funcionalidades' : 'Ver todas as funcionalidades'}</span>
                <LandingIcon name={showAllFeatures ? 'chevronUp' : 'chevronDown'} />
              </button>
              <div className={`landing-features-expand__panel${showAllFeatures ? ' landing-features-expand__panel--open' : ''}`}>
                <ul className="landing-features-all">
                  {landingFeaturesAll.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </LandingReveal>
          </div>
        </LandingScene>

        <LandingScene className="landing-section-scene">
          <div className="landing-container">
            <LandingReveal delay={0} className="landing-section-head landing-section-head--center">
              <h2 className="landing-section-title">Resultado sem complexidade</h2>
            </LandingReveal>
            <LandingStatsRow>
              {landingStats.map((stat, index) => (
                <LandingReveal
                  key={stat.label}
                  delay={index * 130}
                  className={`landing-glass-card landing-stat-card landing-stat-card--${stat.color} landing-interactive`}
                >
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </LandingReveal>
              ))}
            </LandingStatsRow>
          </div>
        </LandingScene>

        <LandingScene id="preco" className="landing-section-scene landing-pricing-scene">
          <div className="landing-container">
            <LandingPricingSection />
          </div>
        </LandingScene>

        <LandingScene className="landing-section-scene landing-social-scene">
          <div className="landing-container landing-social-stack">
            <LandingReveal delay={0} className="landing-section-head landing-section-head--center">
              <h2 className="landing-section-title">Quem usa, recomenda</h2>
            </LandingReveal>
            <div className="landing-testimonials">
              <LandingReveal delay={0} className="landing-glass-card landing-testimonial landing-testimonial--featured landing-interactive">
                <LandingIcon name="quote" className="landing-testimonial__quote-icon" />
                <p>“{featuredTestimonial.quote}”</p>
                <footer className="landing-testimonial__author">
                  <span className="landing-testimonial__avatar" aria-hidden="true">
                    {featuredTestimonial.name.charAt(0)}
                  </span>
                  <div>
                    <strong>{featuredTestimonial.name}</strong>
                    <span>{featuredTestimonial.role}</span>
                  </div>
                </footer>
              </LandingReveal>
              <div className="landing-testimonials__side">
                {otherTestimonials.map((item, index) => (
                  <LandingReveal
                    key={item.name}
                    delay={120 + index * 120}
                    className="landing-glass-card landing-testimonial landing-interactive"
                  >
                    <p>“{item.quote}”</p>
                    <footer className="landing-testimonial__author">
                      <span className="landing-testimonial__avatar" aria-hidden="true">
                        {item.name.charAt(0)}
                      </span>
                      <div>
                        <strong>{item.name}</strong>
                        <span>{item.role}</span>
                      </div>
                    </footer>
                  </LandingReveal>
                ))}
              </div>
            </div>

            <LandingReveal delay={360} className="landing-glass-card landing-cta-card landing-interactive">
              <h2>{landingCta.title}</h2>
              <p>{landingCta.text}</p>
              <div className="landing-cta-card__actions">
                <WhatsAppButton className="landing-btn landing-btn--primary landing-btn--lg landing-interactive">
                  Falar no WhatsApp
                </WhatsAppButton>
                <a
                  href={getStorePublicUrl(NIMBUS_DEMO_SLUG)}
                  className="landing-btn landing-btn--soft landing-btn--lg landing-interactive"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver cardápio demo
                </a>
              </div>
            </LandingReveal>
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
