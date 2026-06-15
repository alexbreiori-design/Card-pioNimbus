'use client';

import { useCardapio } from '@/context/CardapioContext';
import MenuImageArea from '@/components/cardapio/MenuImageArea';

export default function PromoProductCard({ product }) {
  const { openProduct, formatPrice } = useCardapio();
  const isPromo = product.isPromocao && product.promoOriginalPrice > product.price;

  return (
    <button
      type="button"
      className="promo-product-card"
      onClick={() => openProduct(product.id)}
    >
      <MenuImageArea
        imageUrl={product.imageUrl}
        className="promo-product-card-img"
        alt={product.name}
        sizes="160px"
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
