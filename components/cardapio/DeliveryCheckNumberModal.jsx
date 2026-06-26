'use client';

import { useEffect, useRef } from 'react';
import { useCardapio } from '@/context/CardapioContext';
import { IconClose } from './icons';

export default function DeliveryCheckNumberModal() {
  const numInputRef = useRef(null);
  const {
    deliveryCheckNumberOpen,
    closeDeliveryCheckNumber,
    openDeliveryCheckCep,
    addrForm,
    setAddrForm,
    confirmDeliveryCheckNumber,
  } = useCardapio();

  const handleOverlayClick = (e) => {
    if (e.target.id === 'deliveryCheckNumberOverlay') closeDeliveryCheckNumber();
  };

  useEffect(() => {
    if (!deliveryCheckNumberOpen) return undefined;
    const id = window.requestAnimationFrame(() => {
      numInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [deliveryCheckNumberOpen]);

  const addressLine = [
    addrForm.rua,
    addrForm.bairro,
    [addrForm.cidade, addrForm.estado].filter(Boolean).join(' - '),
    addrForm.cep,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className={`generic-overlay ${deliveryCheckNumberOpen ? 'open' : ''}`}
      id="deliveryCheckNumberOverlay"
      onClick={handleOverlayClick}
    >
      <div className="modal-card">
        <div className="modal-topbar">
          <div style={{ width: 30 }} />
          <div className="modal-topbar-title">Confirme o número</div>
          <button type="button" className="modal-close" onClick={closeDeliveryCheckNumber}>
            <IconClose />
          </button>
        </div>
        <div className="modal-body delivery-check-number-body">
          <p className="delivery-check-number-hint">
            Para calcular a rota com precisão, confirme o número do endereço.
          </p>
          <div className="delivery-check-address-preview">{addressLine || 'Endereço informado'}</div>
          <input
            ref={numInputRef}
            className="form-input"
            type="text"
            placeholder="Número *"
            value={addrForm.num}
            onChange={(e) => setAddrForm((f) => ({ ...f, num: e.target.value }))}
          />
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn-modal-back"
            onClick={() => {
              closeDeliveryCheckNumber();
              openDeliveryCheckCep();
            }}
          >
            VOLTAR
          </button>
          <button type="button" className="btn-modal-confirm" onClick={confirmDeliveryCheckNumber}>
            VERIFICAR
          </button>
        </div>
      </div>
    </div>
  );
}
