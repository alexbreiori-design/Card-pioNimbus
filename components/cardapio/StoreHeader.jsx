'use client';

import { useCardapio } from '@/context/CardapioContext';
import { getStoreClosedBannerText } from '@/lib/storeHours';
import { IconChevron, IconClock, IconUserPin } from './icons';

export default function StoreHeader() {
  const {
    infoOpen,
    toggleInfo,
    toggleDeliveryCard,
    deliveryMiniOpen,
    currentDeliveryMode,
    selectDeliveryMode,
    locStrong,
    locSub,
    storeConfig,
    formatStoreAddress,
    pickupDurationLabel,
    deliveryDurationLabel,
  } = useCardapio();
  const weekdays = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const dayKey = weekdays[new Date().getDay()];
  const today = storeConfig?.horarios?.[dayKey];
  const todaySchedule = !today || today.fechado
    ? 'Fechado hoje'
    : `${today.abertura} às ${today.fechamento}`;
  const closedBannerText = !storeConfig.aberta ? getStoreClosedBannerText(storeConfig) : null;

  return (
    <div className="store-header">
      <div className="store-identity">
        <div className="store-avatar">
          {storeConfig.logoUrl ? (
            <img src={storeConfig.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span className="image-placeholder-icon" />
          )}
        </div>
        <div>
          <div className="store-name">{storeConfig.nome}</div>
          <div className="store-meta">
            <div className="store-min-order-chip">
              Pedido minimo: R$ {Number(storeConfig.pedidoMinimo || 0).toFixed(2).replace('.', ',')}
            </div>
            <button type="button" className="more-info-btn" onClick={toggleInfo}>
              Mais informações
            </button>
          </div>
          {storeConfig.aberta ? <div className="store-open">Loja Aberta</div> : null}
        </div>
      </div>
      {closedBannerText ? <div className="store-closed-banner">{closedBannerText}</div> : null}

      <div className={`info-dropdown ${infoOpen ? 'open' : ''}`}>
        <strong>WhatsApp:</strong> {storeConfig.whatsapp || storeConfig.telefone || '-'}
        <br />
        <strong>Funcionamento hoje:</strong> {todaySchedule}
        <br />
        <strong>Endereço:</strong> {formatStoreAddress(storeConfig)}
        {storeConfig.descricao ? (
          <>
            <br />
            <strong>Sobre:</strong> {storeConfig.descricao}
          </>
        ) : null}
      </div>

      <div
        className="store-location-bar"
        id="locationBar"
        onClick={toggleDeliveryCard}
        role="button"
        tabIndex={0}
      >
        <span className="loc-icon">
          {currentDeliveryMode === 'retirar' ? <IconClock /> : <IconUserPin />}
        </span>
        <div className="loc-text">
          <strong>{locStrong}</strong>
          <span>{locSub}</span>
        </div>
        <span className="chevron">
          <IconChevron />
        </span>

        <div
          className={`delivery-mini-card ${deliveryMiniOpen ? 'open' : ''}`}
          onClick={(e) => e.stopPropagation()}
          role="presentation"
        >
          <div
            className={`delivery-mini-item ${currentDeliveryMode === 'retirar' ? 'selected' : ''}`}
            onClick={() => selectDeliveryMode('retirar')}
            role="button"
            tabIndex={0}
          >
            <IconClock />
            <div className="delivery-mini-item-text">
              <span className="delivery-mini-item-label">Retirar no estabelecimento</span>
              <span className="delivery-mini-item-eta">Pronto em ~{pickupDurationLabel}</span>
            </div>
          </div>
          <div
            className={`delivery-mini-item ${currentDeliveryMode === 'entregar' ? 'selected' : ''}`}
            onClick={() => selectDeliveryMode('entregar')}
            role="button"
            tabIndex={0}
          >
            <IconUserPin />
            <div className="delivery-mini-item-text">
              <span className="delivery-mini-item-label">Receber em casa</span>
              <span className="delivery-mini-item-eta">Entrega em ~{deliveryDurationLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
