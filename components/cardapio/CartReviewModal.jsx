'use client';

import { useCardapio } from '@/context/CardapioContext';
import { IconClose } from './icons';
import SacolaPanel from './SacolaPanel';

export default function CartReviewModal() {
  const { cartReviewOpen, closeCartReview, finalizeFromCartReview } = useCardapio();

  const handleOverlayClick = (e) => {
    if (e.target.id === 'cartReviewOverlay') closeCartReview();
  };

  return (
    <div
      className={`cart-review-overlay ${cartReviewOpen ? 'open' : ''}`}
      id="cartReviewOverlay"
      onClick={handleOverlayClick}
    >
      <div className="cart-review-sheet" role="dialog" aria-modal="true" aria-label="Resumo da sacola">
        <div className="cart-review-topbar">
          <div className="cart-review-topbar-title">Sua sacola</div>
          <button type="button" className="modal-close" onClick={closeCartReview} aria-label="Fechar">
            <IconClose />
          </button>
        </div>
        <div className="cart-review-body">
          <SacolaPanel
            onAddMore={closeCartReview}
            onFinalize={finalizeFromCartReview}
            finalizeLabel="Finalizar pedido"
          />
        </div>
      </div>
    </div>
  );
}
