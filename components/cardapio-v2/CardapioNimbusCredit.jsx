'use client';

import { getSiteOrigin } from '@/lib/siteUrl';

export default function CardapioNimbusCredit() {
  const landingUrl = getSiteOrigin();

  return (
    <a
      href={landingUrl}
      className="cardapio-v2-info-footer-nimbus"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Desenvolvido por Cardápio Nimbus — conheça a plataforma"
    >
      <span className="cardapio-v2-info-footer-nimbus-label">Desenvolvido por</span>
      <span className="cardapio-v2-info-footer-nimbus-icon-wrap" aria-hidden="true">
        <img
          src="/images/icon-wt.png"
          alt=""
          width={24}
          height={24}
          className="cardapio-v2-info-footer-nimbus-icon"
          decoding="async"
        />
      </span>
      <span className="cardapio-v2-info-footer-nimbus-name">Cardápio Nimbus</span>
    </a>
  );
}
