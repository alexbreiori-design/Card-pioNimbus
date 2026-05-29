'use client';

import { useCardapio } from '@/context/CardapioContext';
import { IconClose } from './icons';

export default function CupomModal() {
  const {
    cupomOpen,
    closeCupomPopup,
    cupomValue,
    setCupomValue,
    aplicarCupom,
    cupomInputRef,
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
          <div className="cupom-hint">Ex: ACAI10, PRIMEIROAPP, FRETE0</div>
        </div>
      </div>
    </div>
  );
}
