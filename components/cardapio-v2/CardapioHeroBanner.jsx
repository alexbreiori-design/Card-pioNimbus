'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCardapio } from '@/context/CardapioContext';
import { HeroGlassChip, V2Icon } from './CardapioV2Icons';
import HeroRotatingChip from './HeroRotatingChip';
import CardapioShareModal from './CardapioShareModal';

const WEEKDAY_KEYS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

export default function CardapioHeroBanner() {
  const {
    storeConfig,
    formatPrice,
    deliveryDurationLabel,
    toggleDeliveryCard,
    formatStoreAddress,
  } = useCardapio();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);

  const todaySchedule = useMemo(() => {
    const dayKey = WEEKDAY_KEYS[new Date().getDay()];
    const today = storeConfig?.horarios?.[dayKey];
    if (!today || today.fechado) return 'Fechado hoje';
    return `${today.abertura} – ${today.fechamento}`;
  }, [storeConfig?.horarios]);

  const minOrder = Number(storeConfig?.pedidoMinimo || 0);
  const isOpen = Boolean(storeConfig?.aberta);
  const hasCover = Boolean(storeConfig?.capaUrl);
  const descricao = String(storeConfig?.descricao || '').trim();

  const addressLine = useMemo(() => {
    const formatted = formatStoreAddress(storeConfig);
    return String(formatted || storeConfig?.endereco || '').trim();
  }, [storeConfig, formatStoreAddress]);

  const minOrderValue = minOrder > 0 ? formatPrice(minOrder) : 'Sem mínimo';
  const shareTitle = storeConfig?.nome || 'Cardápio';

  return (
    <>
      <section className="cardapio-v2-hero" aria-label="Apresentação da loja">
        <div
          className={`cardapio-v2-hero-media${hasCover ? ' has-cover' : ''}`}
          style={hasCover ? { backgroundImage: `url(${storeConfig.capaUrl})` } : undefined}
        />
        <div className="cardapio-v2-hero-gradient" aria-hidden="true" />

        <div className="cardapio-v2-hero-content">
          {descricao ? (
            <HeroGlassChip className="cardapio-v2-hero-desc-chip">
              <span className="cardapio-v2-hero-chip-value">{descricao}</span>
            </HeroGlassChip>
          ) : null}

          <h1 className="cardapio-v2-hero-title">{storeConfig?.nome || 'Cardápio'}</h1>

          <div className="cardapio-v2-hero-store-meta">
            <div className="cardapio-v2-hero-status-row">
              <V2Icon name="alarm" duotone className="cardapio-v2-hero-schedule-icon" />
              <span className="cardapio-v2-hero-schedule">{todaySchedule}</span>
              <span className="cardapio-v2-hero-status-divider" aria-hidden="true">
                |
              </span>
              <span className={`cardapio-v2-hero-status${isOpen ? ' is-open' : ' is-closed'}`}>
                <span className="cardapio-v2-hero-dot" aria-hidden="true" />
                {isOpen ? 'Aberta' : 'Fechada'}
              </span>
            </div>
            {addressLine ? (
              <p className="cardapio-v2-hero-address">
                <V2Icon name="map-pin" fill className="cardapio-v2-hero-pin" />
                <span>{addressLine}</span>
              </p>
            ) : null}
          </div>

          <div className="cardapio-v2-hero-chips-row">
            {deliveryDurationLabel ? (
              <HeroRotatingChip
                icon="clock"
                label="Entrega em até"
                value={deliveryDurationLabel}
                ariaLabel={`Entrega em até ${deliveryDurationLabel}`}
              />
            ) : null}
            <HeroRotatingChip
              icon="receipt"
              label="Pedido mínimo"
              value={minOrderValue}
              ariaLabel={`Pedido mínimo ${minOrderValue}`}
            />
          </div>

          <div className="cardapio-v2-hero-actions">
            <button
              type="button"
              className="cardapio-v2-hero-btn cardapio-v2-hero-btn--primary"
              onClick={toggleDeliveryCard}
            >
              <V2Icon name="motorcycle" className="cardapio-v2-hero-btn-icon" />
              Consultar entrega
            </button>
            <button
              type="button"
              className="cardapio-v2-hero-btn cardapio-v2-hero-btn--outline cardapio-v2-hero-btn--share"
              aria-label="Compartilhar cardápio"
              onClick={() => setShareOpen(true)}
            >
              <V2Icon name="share" className="cardapio-v2-hero-btn-icon" />
              <span className="cardapio-v2-hero-btn-label">Compartilhar</span>
            </button>
          </div>
        </div>
      </section>

      <CardapioShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={shareTitle}
        url={shareUrl}
      />
    </>
  );
}
