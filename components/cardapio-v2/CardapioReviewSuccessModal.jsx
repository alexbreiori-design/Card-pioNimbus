'use client';

import { useEffect } from 'react';
import { V2Icon } from './CardapioV2Icons';

export default function CardapioReviewSuccessModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handleOverlayClick(event) {
    if (event.target === event.currentTarget) onClose?.();
  }

  return (
    <div
      className="cardapio-v2-modal-overlay open"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="cardapio-v2-modal cardapio-v2-modal--success"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cardapio-v2-review-success-title"
      >
        <div className="cardapio-v2-review-success-body">
          <div className="cardapio-v2-review-success-icon-wrap" aria-hidden="true">
            <V2Icon name="star" fill className="cardapio-v2-review-success-icon" />
          </div>
          <h3 id="cardapio-v2-review-success-title" className="cardapio-v2-review-success-title">
            Avaliação enviada
          </h3>
          <p className="cardapio-v2-review-success-text">
            Obrigado por compartilhar sua experiência. Sua avaliação ficará disponível em breve no
            cardápio.
          </p>
          <button
            type="button"
            className="cardapio-v2-modal-btn cardapio-v2-modal-btn--primary cardapio-v2-review-success-btn"
            onClick={onClose}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
