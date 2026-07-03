'use client';

import { useEffect, useState } from 'react';
import { HeroGlassChip, V2Icon } from './CardapioV2Icons';
import { useCardapioV2Mobile } from './useCardapioV2Mobile';

const ROTATE_MS = 2800;

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
      <V2Icon name={icon} className="cardapio-v2-hero-chip-icon" />
      {isMobile ? (
        <span className="cardapio-v2-hero-chip-rotate" aria-live="polite">
          <span
            className={`cardapio-v2-hero-chip-rotate-line${showValue ? ' is-hidden' : ' is-visible'}`}
          >
            {label}
          </span>
          <span
            className={`cardapio-v2-hero-chip-rotate-line${showValue ? ' is-visible' : ' is-hidden'}`}
          >
            {value}
          </span>
        </span>
      ) : (
        <>
          <span className="cardapio-v2-hero-chip-label">{label}</span>
          <span className="cardapio-v2-hero-chip-value">{value}</span>
        </>
      )}
    </HeroGlassChip>
  );
}
