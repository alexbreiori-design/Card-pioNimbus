'use client';

import { getPromoDiscountPercent } from '@/lib/promocoes';
import PromoFireIcon from './PromoFireIcon';

export default function ProductPromoChip({ originalPrice, promoPrice }) {
  const percent = getPromoDiscountPercent(originalPrice, promoPrice);
  if (percent <= 0) return null;

  return (
    <span className="cardapio-product-promo-chip" aria-label={`Promoção de ${percent}%`}>
      <span className="cardapio-product-promo-chip-bg" aria-hidden="true" />
      <span className="cardapio-product-promo-chip-inner">
        <PromoFireIcon size={13} className="cardapio-product-promo-chip-icon" />
        <span className="cardapio-product-promo-chip-text">-{percent}%</span>
      </span>
    </span>
  );
}
