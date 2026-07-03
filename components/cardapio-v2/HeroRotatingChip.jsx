'use client';

import { useEffect, useState } from 'react';
import { HeroGlassChip, V2Icon } from './CardapioV2Icons';
import { useCardapioV2Mobile } from './useCardapioV2Mobile';

const ROTATE_MS = 3100;

export default function HeroRotatingChip({ icon, label, value, ariaLabel }) {
  const isMobile = useCardapioV2Mobile();
  const [showValue, setShowValue] = useState(false);

  useEffect(() => {
    if (!isMobile) return undefined;
    const timer = window.setInterval(() => {
      setShowValue((current) => !current);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [isMobile]);

  return (
    <HeroGlassChip aria-label={ariaLabel}>
      {isMobile ? (
        <span className="cardapio-v2-hero-chip-rotate" aria-live="polite">
          <span
            className={`cardapio-v2-hero-chip-rotate-line cardapio-v2-hero-chip-rotate-label${showValue ? ' is-hidden' : ' is-visible'}`}
          >
            {label}
          </span>
          <span
            className={`cardapio-v2-hero-chip-rotate-line cardapio-v2-hero-chip-rotate-value${showValue ? ' is-visible' : ' is-hidden'}`}
          >
            <V2Icon name={icon} className="cardapio-v2-hero-chip-icon" />
            <span className="cardapio-v2-hero-chip-value">{value}</span>
          </span>
        </span>
      ) : (
        <>
          <V2Icon name={icon} className="cardapio-v2-hero-chip-icon" />
          <span className="cardapio-v2-hero-chip-label">{label}</span>
          <span className="cardapio-v2-hero-chip-value">{value}</span>
        </>
      )}
    </HeroGlassChip>
  );
}
