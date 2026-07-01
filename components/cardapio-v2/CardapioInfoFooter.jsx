'use client';

import { useMemo } from 'react';
import { useCardapio } from '@/context/CardapioContext';
import { getSiteOrigin } from '@/lib/siteUrl';
import { V2Icon } from './CardapioV2Icons';
import { useCardapioV2Mobile } from './useCardapioV2Mobile';
import { CARDAPIO_V2_SECTION } from './cardapioV2Sections';
import {
  FOOTER_WEEKDAY_LABELS,
  FOOTER_WEEKDAY_ORDER,
  buildFooterPaymentLabels,
  buildMapsSearchUrl,
  buildWhatsAppUrl,
  formatFooterDaySchedule,
  getFooterTodayKey,
} from '@/lib/cardapioV2StoreInfo';

export default function CardapioInfoFooter() {
  const isMobile = useCardapioV2Mobile();
  const {
    storeConfig,
    formatStoreAddress,
    formatPrice,
    pickupDurationLabel,
    deliveryDurationLabel,
  } = useCardapio();

  const landingUrl = getSiteOrigin();
  const todayKey = getFooterTodayKey();
  const addressLine = useMemo(() => {
    const formatted = formatStoreAddress(storeConfig);
    return String(formatted || storeConfig?.endereco || '').trim();
  }, [storeConfig, formatStoreAddress]);

  const whatsappPhone = storeConfig?.whatsapp || storeConfig?.telefone || '';
  const whatsappUrl = buildWhatsAppUrl(whatsappPhone);
  const mapsUrl = buildMapsSearchUrl(addressLine);
  const minOrder = Number(storeConfig?.pedidoMinimo || 0);
  const paymentLabels = buildFooterPaymentLabels(storeConfig?.exibirPixCardapio);
  const descricao = String(storeConfig?.descricao || '').trim();
  const telefone = String(storeConfig?.telefone || storeConfig?.whatsapp || '').trim();

  const scheduleRows = FOOTER_WEEKDAY_ORDER.map((dayKey) => ({
    key: dayKey,
    label: FOOTER_WEEKDAY_LABELS[dayKey],
    value: formatFooterDaySchedule(storeConfig?.horarios?.[dayKey]),
    isToday: dayKey === todayKey,
  }));
  const todaySchedule = scheduleRows.find((row) => row.isToday);

  return (
    <footer
      className="cardapio-v2-info-footer"
      id={CARDAPIO_V2_SECTION.informacoes}
      aria-label="Informações da loja"
    >
      <div className="cardapio-v2-info-footer-inner">
        <div className="cardapio-v2-info-footer-grid">
          <section className="cardapio-v2-info-footer-col" aria-labelledby="cardapio-v2-info-about">
            <h2 className="cardapio-v2-info-footer-title" id="cardapio-v2-info-about">
              {storeConfig?.nome || 'Cardápio'}
            </h2>
            {descricao ? (
              <p className="cardapio-v2-info-footer-about">{descricao}</p>
            ) : (
              <p className="cardapio-v2-info-footer-about cardapio-v2-info-footer-about--muted">
                Conheça nosso cardápio e faça seu pedido online com praticidade.
              </p>
            )}
            <ul className="cardapio-v2-info-footer-list">
              {telefone ? (
                <li>
                  <V2Icon name="phone" className="cardapio-v2-info-footer-list-icon" />
                  <a href={`tel:${telefone.replace(/\s/g, '')}`}>{telefone}</a>
                </li>
              ) : null}
              {addressLine ? (
                <li className="cardapio-v2-info-footer-list-item--address">
                  <V2Icon name="map-pin" fill className="cardapio-v2-info-footer-list-icon is-pin" />
                  <span>{addressLine}</span>
                </li>
              ) : null}
            </ul>
            <div className="cardapio-v2-info-footer-actions">
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cardapio-v2-info-footer-btn cardapio-v2-info-footer-btn--primary"
                >
                  WhatsApp
                </a>
              ) : null}
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cardapio-v2-info-footer-btn cardapio-v2-info-footer-btn--outline"
                >
                  Ver no mapa
                </a>
              ) : null}
            </div>
          </section>

          <section className="cardapio-v2-info-footer-col" aria-labelledby="cardapio-v2-info-hours">
            {isMobile ? (
              <details className="cardapio-v2-info-footer-schedule-panel">
                <summary className="cardapio-v2-info-footer-schedule-summary">
                  <span className="cardapio-v2-info-footer-heading" id="cardapio-v2-info-hours">
                    Horário de funcionamento
                  </span>
                  {todaySchedule ? (
                    <span className="cardapio-v2-info-footer-schedule-today-hint">
                      Hoje: {todaySchedule.value}
                    </span>
                  ) : null}
                </summary>
                <ul className="cardapio-v2-info-footer-schedule">
                  {scheduleRows.map((row) => (
                    <li
                      key={row.key}
                      className={`cardapio-v2-info-footer-schedule-row${row.isToday ? ' is-today' : ''}`}
                    >
                      <span className="cardapio-v2-info-footer-schedule-day">{row.label}</span>
                      <span className="cardapio-v2-info-footer-schedule-time">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <>
                <h3 className="cardapio-v2-info-footer-heading" id="cardapio-v2-info-hours">
                  Horário de funcionamento
                </h3>
                <ul className="cardapio-v2-info-footer-schedule">
                  {scheduleRows.map((row) => (
                    <li
                      key={row.key}
                      className={`cardapio-v2-info-footer-schedule-row${row.isToday ? ' is-today' : ''}`}
                    >
                      <span className="cardapio-v2-info-footer-schedule-day">{row.label}</span>
                      <span className="cardapio-v2-info-footer-schedule-time">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="cardapio-v2-info-footer-col" aria-labelledby="cardapio-v2-info-orders">
            <h3 className="cardapio-v2-info-footer-heading" id="cardapio-v2-info-orders">
              Pedidos e pagamento
            </h3>
            <dl
              className={
                isMobile
                  ? 'cardapio-v2-info-footer-details cardapio-v2-info-footer-details--orders'
                  : 'cardapio-v2-info-footer-details'
              }
            >
              <div className="cardapio-v2-info-footer-detail">
                <dt>Pedido mínimo</dt>
                <dd>{minOrder > 0 ? formatPrice(minOrder) : 'Sem mínimo'}</dd>
              </div>
              {isMobile ? (
                <div className="cardapio-v2-info-footer-detail">
                  <dt>Entrega</dt>
                  <dd>{deliveryDurationLabel ? `até ${deliveryDurationLabel}` : '—'}</dd>
                </div>
              ) : deliveryDurationLabel ? (
                <div className="cardapio-v2-info-footer-detail">
                  <dt>Entrega</dt>
                  <dd>até {deliveryDurationLabel}</dd>
                </div>
              ) : null}
              {!isMobile && pickupDurationLabel ? (
                <div className="cardapio-v2-info-footer-detail">
                  <dt>Retirada</dt>
                  <dd>até {pickupDurationLabel}</dd>
                </div>
              ) : null}
              <div className="cardapio-v2-info-footer-detail">
                <dt>{isMobile ? 'Pagamento' : 'Formas de pagamento'}</dt>
                <dd>{paymentLabels.join(' · ')}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

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
    </footer>
  );
}
