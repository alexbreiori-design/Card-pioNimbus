'use client';

import { useCardapio } from '@/context/CardapioContext';

export default function PromoProductCard({ product }) {
  const { openProduct, formatPrice } = useCardapio();
  const hasImage = Boolean(product.imageUrl);
  const isPromo = product.isPromocao && product.promoOriginalPrice > product.price;

  return (
    <button
      type="button"
      className="promo-product-card"
      onClick={() => openProduct(product.id)}
    >
      <div
        className={`promo-product-card-img ${hasImage ? 'has-image' : 'is-placeholder'}`}
        style={hasImage ? { backgroundImage: `url(${product.imageUrl})` } : undefined}
      />
      <div className="promo-product-card-body">
        <div className="promo-product-card-title">{product.name}</div>
        {product.desc ? <div className="promo-product-card-desc">{product.desc}</div> : null}
        <div className={`promo-product-card-price ${isPromo ? 'has-promo' : ''}`}>
          {isPromo ? (
            <>
              <span className="product-price-original">{formatPrice(product.promoOriginalPrice)}</span>
              <span className="product-price-promo">{formatPrice(product.price)}</span>
            </>
          ) : (
            formatPrice(product.price)
          )}
        </div>
      </div>
    </button>
  );
}
