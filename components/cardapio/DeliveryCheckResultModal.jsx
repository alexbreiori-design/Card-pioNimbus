'use client';

import { useCardapio } from '@/context/CardapioContext';
import { IconClose } from './icons';

export default function DeliveryCheckResultModal() {
  const { deliveryCheckResultOpen, deliveryCheckResult, closeDeliveryCheckResult, formatPrice } =
    useCardapio();

  const handleOverlayClick = (e) => {
    if (e.target.id === 'deliveryCheckResultOverlay') closeDeliveryCheckResult();
  };

  if (!deliveryCheckResult) return null;

  const available = deliveryCheckResult.available === true;
  const fee = Number(deliveryCheckResult.fee || 0);

  return (
    <div
      className={`generic-overlay ${deliveryCheckResultOpen ? 'open' : ''}`}
      id="deliveryCheckResultOverlay"
      onClick={handleOverlayClick}
    >
      <div className="modal-card delivery-check-result-card">
        <div className="modal-topbar">
          <div style={{ width: 30 }} />
          <div className="modal-topbar-title">Disponibilidade de entrega</div>
          <button type="button" className="modal-close" onClick={closeDeliveryCheckResult}>
            <IconClose />
          </button>
        </div>
        <div className="modal-body delivery-check-result-body">
          {available ? (
            <div className="delivery-check-result delivery-check-result--success">
              <div className="delivery-check-result-icon success-icon">🎉</div>
              <p className="delivery-check-result-title delivery-check-result-title--animated">
                Ótima notícia! Nós entregamos na sua região.
              </p>
              <p className="delivery-check-result-sub">
                {fee > 0
                  ? `Tem apenas uma taxinha de ${formatPrice(fee)}.`
                  : 'E a taxa de entrega é grátis!'}
              </p>
            </div>
          ) : (
            <div className="delivery-check-result delivery-check-result--fail">
              <p className="delivery-check-result-title">
                Poxa, que pena. Infelizmente não entregamos na sua região.
              </p>
              <p className="delivery-check-result-sub">
                Mas você é super bem-vindo a conhecer nossa loja pessoalmente.
              </p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-modal-confirm" onClick={closeDeliveryCheckResult}>
            ENTENDI
          </button>
        </div>
      </div>
    </div>
  );
}
