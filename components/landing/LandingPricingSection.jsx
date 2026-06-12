'use client';

import Image from 'next/image';
import LandingReveal from '@/components/landing/LandingReveal';
import { NIMBUS_PRICE, whatsappUrl } from '@/lib/landing/constants';

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
  const { integer, cents } = parsePriceParts(NIMBUS_PRICE);

  return (
    <div className="wrapper">
      <LandingReveal delay={0} className="landing-pricing-reveal">
        <div className="left-card">
        <div className="left-glass-border" aria-hidden="true" />

        <div className="badge">
          <div className="badge-icon">
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M6 1l1.2 2.4L10 4.1 8 6l.5 2.9L6 7.6 3.5 8.9 4 6 2 4.1l2.8-.7z" />
            </svg>
          </div>
          O Cardápio Nimbus Completo
        </div>

        <h2 className="headline">
          Um preço. <span>Tudo incluso.</span>
        </h2>
        <p className="sub1">Sem plano Pro, sem módulo extra.</p>
        <p className="sub2">Valor fixo pelo Cardápio Nimbus completo.</p>
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
                Cardápio público ilimitado
              </li>
              <li>
                <CheckIcon />
                Produtos, adicionais, promoções e cupons
              </li>
              <li>
                <CheckIcon />
                Taxa de entrega por zona e distância
              </li>
              <li>
                <CheckIcon />
                WhatsApp no fluxo de pedidos
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
                Painel de pedidos em kanban
              </li>
              <li>
                <CheckIcon />
                Impressão de ticket térmico
              </li>
              <li>
                <CheckIcon />
                Múltiplos endereços por cliente
              </li>
              <li>
                <CheckIcon />
                Troca automática de cardápio por dia
              </li>
              <li>
                <CheckIcon />
                CRM de clientes
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
                Treinamento incluso
              </li>
              <li>
                <CheckIcon />
                Ativação em até 48h
              </li>
              <li>
                <CheckIcon />
                Segmentos adaptados (marmita, pizza e mais)
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

      <LandingReveal delay={140} className="landing-pricing-reveal">
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
          <Image src="/images/icon-wt.png" alt="" width={44} height={44} className="app-icon__image" priority />
        </div>

        <div className="plan-label-row">
          <span className="plan-chip">Nimbus Completo</span>
        </div>

        <div className="price-block">
          <span className="price-currency">R$</span>
          <span className="price-integer">{integer}</span>
          <div className="price-cents-wrap">
            <span className="price-cents">{cents}</span>
            <span className="price-period">/mês</span>
          </div>
        </div>

        <p className="price-desc">
          <strong>Tudo incluso</strong> • sem módulos extras
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
  );
}
