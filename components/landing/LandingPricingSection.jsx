'use client';

import { useState } from 'react';
import Image from 'next/image';
import LandingReveal, { LandingRevealGroup } from '@/components/landing/LandingReveal';
import { landingPricing } from '@/lib/landing/content';
import { whatsappUrl } from '@/lib/landing/constants';

function parsePriceParts(priceLabel) {
  const match = String(priceLabel || '').match(/R\$\s*(\d+)[,.](\d{2})/);
  if (!match) return { integer: '149', cents: ',90' };
  return { integer: match[1], cents: `,${match[2]}` };
}

function CheckIcon() {
  return (
    <svg
      className="check"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function LandingPricingSection() {
  const [billing, setBilling] = useState('monthly');
  const activePrice = billing === 'monthly' ? landingPricing.monthlyPrice : landingPricing.price;
  const { integer, cents } = parsePriceParts(activePrice);
  const { integer: compareInteger, cents: compareCents } = parsePriceParts(landingPricing.compareAtPrice);

  return (
    <LandingRevealGroup step={280}>
      <LandingReveal className="landing-pricing__intro">
        <p className="landing-pricing__eyebrow">{landingPricing.eyebrow}</p>
        <h2 className="landing-pricing__section-title">{landingPricing.sectionTitle}</h2>
      </LandingReveal>

      <div className="wrapper">
        <LandingReveal className="landing-pricing-reveal">
          <div className="left-card">
            <div className="left-glass-border" aria-hidden="true" />

            <h2 className="headline">
              Um preço. <span>Tudo incluso.</span>
            </h2>
            <p className="sub-highlight">{landingPricing.highlightText}</p>
            <hr className="divider" />

            <div className="features-grid">
              <div className="feature-col">
                <div className="feature-col-header">
                  <svg
                    className="feature-col-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 01-8 0" />
                  </svg>
                  <span className="feature-col-label">Vendas</span>
                </div>
                <ul className="feature-list">
                  <li>
                    <CheckIcon />
                    Cardápio digital ilimitado
                  </li>
                  <li>
                    <CheckIcon />
                    Pagamento online (pix e cartão)
                  </li>
                  <li>
                    <CheckIcon />
                    Produtos, adicionais, promoções e cupons
                  </li>
                  <li>
                    <CheckIcon />
                    Taxa de entrega por distância
                  </li>
                  <li>
                    <CheckIcon />
                    Pixel do Facebook
                  </li>
                </ul>
              </div>

              <div className="feature-col">
                <div className="feature-col-header">
                  <svg
                    className="feature-col-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="5" y="2" width="14" height="20" rx="2" />
                    <line x1="9" y1="7" x2="15" y2="7" />
                    <line x1="9" y1="11" x2="15" y2="11" />
                    <line x1="9" y1="15" x2="13" y2="15" />
                  </svg>
                  <span className="feature-col-label">Operação</span>
                </div>
                <ul className="feature-list">
                  <li>
                    <CheckIcon />
                    Pedidos organizados
                  </li>
                  <li>
                    <CheckIcon />
                    Rotas de entregas inteligentes
                  </li>
                  <li>
                    <CheckIcon />
                    Sistema de conta por cliente (fiado)
                  </li>
                  <li>
                    <CheckIcon />
                    Cadastros simplificados
                  </li>
                  <li>
                    <CheckIcon />
                    Loja personalizada
                  </li>
                </ul>
              </div>

              <div className="feature-col">
                <div className="feature-col-header">
                  <svg
                    className="feature-col-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  <span className="feature-col-label">Suporte e Crescimento</span>
                </div>
                <ul className="feature-list">
                  <li>
                    <CheckIcon />
                    Suporte 100% humano
                  </li>
                  <li>
                    <CheckIcon />
                    Treinamento personalizado
                  </li>
                  <li>
                    <CheckIcon />
                    Ativação rápida
                  </li>
                  <li>
                    <CheckIcon />
                    Cardápio adaptado por segmento
                  </li>
                  <li>
                    <CheckIcon />
                    Desconto para multi lojas
                  </li>
                </ul>
              </div>
            </div>

            <div className="footer-note">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Tudo o que você precisa para vender mais e gerenciar melhor, em um só lugar.
            </div>
          </div>
        </LandingReveal>

        <LandingReveal className="landing-pricing-reveal">
          <div className="right-card">
            <div className="sparkle" aria-hidden="true" />
            <div className="sparkle" aria-hidden="true" />
            <div className="sparkle" aria-hidden="true" />
            <div className="sparkle" aria-hidden="true" />
            <div className="sparkle" aria-hidden="true" />
            <div className="sparkle" aria-hidden="true" />
            <div className="sparkle" aria-hidden="true" />
            <div className="sparkle" aria-hidden="true" />

            <div className="app-icon">
              <Image src="/images/icon-wt.png" alt="" width={80} height={80} className="app-icon__image" priority />
            </div>

            <div className="billing-switch" role="tablist" aria-label="Tipo de cobrança">
              <button
                type="button"
                role="tab"
                id="landing-pricing-tab-monthly"
                aria-selected={billing === 'monthly'}
                aria-controls="landing-pricing-panel"
                className={`billing-switch__option${billing === 'monthly' ? ' is-active' : ''}`}
                onClick={() => setBilling('monthly')}
              >
                Mensal
              </button>
              <button
                type="button"
                role="tab"
                id="landing-pricing-tab-annual"
                aria-selected={billing === 'annual'}
                aria-controls="landing-pricing-panel"
                className={`billing-switch__option${billing === 'annual' ? ' is-active' : ''}`}
                onClick={() => setBilling('annual')}
              >
                Anual
              </button>
            </div>

            <div id="landing-pricing-panel" role="tabpanel" aria-labelledby={`landing-pricing-tab-${billing}`}>
              <div className="price-stack">
                <p className="price-compare" aria-label={`De ${landingPricing.compareAtPrice}`}>
                  <span className="price-compare__currency">R$</span>
                  <span className="price-compare__value">
                    {compareInteger}
                    {compareCents}
                  </span>
                </p>

                <div className="price-block-wrap">
                  {billing === 'annual' ? (
                    <span className="discount-pill">{landingPricing.annualDiscountLabel}</span>
                  ) : null}
                  <div className="price-block">
                    <span className="price-currency">R$</span>
                    <span className="price-integer">{integer}</span>
                    <span className="price-cents">
                      {cents}
                      <span className="price-period">/mês</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="price-desc">
              {billing === 'monthly' ? (
                <>
                  <strong>{landingPricing.monthlyBillingNote.primary}</strong> •{' '}
                  {landingPricing.monthlyBillingNote.secondary}
                </>
              ) : (
                <>
                  <strong>{landingPricing.annualBillingNote.primary}</strong> •{' '}
                  {landingPricing.annualBillingNote.secondary}
                </>
              )}
            </p>
            <div className="divider-right" aria-hidden="true" />

            <div className="no-loyalty">
              <div className="shield-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <p className="no-loyalty-text">
                Sem fidelidade no contrato.
                <br />
                Cancele quando quiser.
              </p>
            </div>

            <div className="no-loyalty trial-box">
              <div className="shield-icon trial-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p className="no-loyalty-text">
                Teste por 7 dias
                <br />
                <strong style={{ color: '#fff', fontSize: '14px' }}>GRÁTIS!</strong>
              </p>
            </div>

            <a className="cta-btn" href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
              <span>Quero começar agora</span>
              <svg
                className="arrow-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
        </LandingReveal>
      </div>
    </LandingRevealGroup>
  );
}
