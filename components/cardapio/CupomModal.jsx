'use client';

import { calculateCupomDiscount } from '@/lib/cupons';
import { useCardapio } from '@/context/CardapioContext';
import { IconClose } from './icons';
export default function CupomModal() {
  const {
    cupomOpen,
    closeCupomPopup,
    cupomValue,
    setCupomValue,
    aplicarCupom,
    appliedCupom,
    clearAppliedCupom,
    cupomInputRef,
    formatPrice,
    cartSubtotal,
  } = useCardapio();

  const handleOverlayClick = (e) => {
    if (e.target.id === 'cupomOverlay') closeCupomPopup();
  };

  return (
    <div
      className={`generic-overlay ${cupomOpen ? 'open' : ''}`}
      id="cupomOverlay"
      onClick={handleOverlayClick}
    >
      <div className="modal-card">
        <div className="modal-topbar">
          <div style={{ width: 30 }} />
          <div className="modal-topbar-title">Cupom de desconto</div>
          <button type="button" className="modal-close" onClick={closeCupomPopup}>
            <IconClose />
          </button>
        </div>
        <div className="modal-body">
          {appliedCupom ? (
            <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10, background: 'var(--bg)' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Cupom {appliedCupom.codigo} aplicado</div>
              <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 4 }}>
                Desconto de {formatPrice(calculateCupomDiscount(appliedCupom, cartSubtotal()))}
              </div>
              <button
                type="button"
                className="btn-modal-back"
                style={{ marginTop: 10 }}
                onClick={() => {
                  clearAppliedCupom();
                  closeCupomPopup();
                }}
              >
                Remover cupom
              </button>
            </div>
          ) : null}
          <p style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 300, marginBottom: 16 }}>
            Insira o código do seu cupom abaixo para aplicar o desconto.
          </p>
          <div className="cupom-input-wrap">
            <input
              ref={cupomInputRef}
              className="cupom-code-input"
              type="text"
              placeholder="CÓDIGO DO CUPOM"
              value={cupomValue}
              onChange={(e) => setCupomValue(e.target.value)}
            />
            <button type="button" className="btn-aplicar-cupom" onClick={aplicarCupom}>
              Aplicar
            </button>
          </div>
          <div className="cupom-hint">Ex: CUPOM10, PRIMEIROAPP, FRETE0</div>
        </div>
      </div>
    </div>
  );
}
