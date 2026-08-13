'use client';

import { getPromoDiscountPercent } from '@/lib/promocoes';
import PromoFireIcon from './PromoFireIcon';

export default function ProductPromoChip({ originalPrice, promoPrice, label = '' }) {
  const customLabel = String(label || '').trim();
  const percent = customLabel ? 0 : getPromoDiscountPercent(originalPrice, promoPrice);
  const text = customLabel || (percent > 0 ? `-${percent}%` : '');
  if (!text) return null;

  return (
    <span
      className="cardapio-product-promo-chip"
      aria-label={customLabel ? customLabel : `Promoção de ${percent}%`}
    >
      <span className="cardapio-product-promo-chip-bg" aria-hidden="true" />
      <span className="cardapio-product-promo-chip-inner">
        <PromoFireIcon size={13} className="cardapio-product-promo-chip-icon" />
        <span className="cardapio-product-promo-chip-text">{text}</span>
      </span>
    </span>
  );
}
