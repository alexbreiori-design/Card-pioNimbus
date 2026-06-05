'use client';

import { useCardapio } from '@/context/CardapioContext';

export default function MobileSacolaBar() {
  const { showMobileSacola, cartCount, cartTotal, formatPrice, openCartReview } = useCardapio();

  if (!showMobileSacola) return null;

  return (
    <button
      type="button"
      className="mobile-ver-sacola"
      style={{ display: 'flex' }}
      onClick={openCartReview}
    >
      <div className="bag-badge">{cartCount()}</div>
      <span className="ver-label">Ver sacola</span>
      <span className="ver-price">{formatPrice(cartTotal())}</span>
    </button>
  );
}
