'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HeroGlassChip, V2Icon } from './CardapioV2Icons';
import { useCardapioV2Mobile } from './useCardapioV2Mobile';

const ROTATE_MS = 4000;

export default function HeroRotatingChip({ icon, label, value, ariaLabel }) {
  const isMobile = useCardapioV2Mobile();
  const [showValue, setShowValue] = useState(false);
  const [boxWidth, setBoxWidth] = useState(null);
  const labelRef = useRef(null);
  const valueRef = useRef(null);

  useEffect(() => {
    if (!isMobile) return undefined;
    const timer = window.setInterval(() => {
      setShowValue((current) => !current);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [isMobile]);

  useLayoutEffect(() => {
    if (!isMobile) return;
    const activeRef = showValue ? valueRef : labelRef;
    const width = activeRef.current?.scrollWidth;
    if (width) setBoxWidth(Math.ceil(width));
  }, [showValue, label, value, isMobile]);

  return (
    <HeroGlassChip aria-label={ariaLabel}>
      <V2Icon name={icon} className="cardapio-v2-hero-chip-icon" />
      {isMobile ? (
        <span
          className="cardapio-v2-hero-chip-rotate"
          style={boxWidth ? { width: `${boxWidth}px` } : undefined}
          aria-live="polite"
        >
          <span
            ref={labelRef}
            className={`cardapio-v2-hero-chip-rotate-line${showValue ? ' is-hidden' : ' is-visible'}`}
          >
            {label}
          </span>
          <span
            ref={valueRef}
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
