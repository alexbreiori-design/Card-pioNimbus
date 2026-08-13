'use client';

import { useCardapio } from '@/context/CardapioContext';
import MenuImageArea from '@/components/cardapio/MenuImageArea';
import ProductPromoChip from '@/components/cardapio/ProductPromoChip';

export default function ProductCard({ product }) {
  const { openProduct, formatPrice } = useCardapio();
  const isPromo = product.isPromocao && product.promoOriginalPrice > product.price;
  const highlightLabel = !isPromo ? String(product.highlightLabel || '').trim() : '';
  const showFromPrice = Boolean(product.priceLabel) && !isPromo;

  return (
    <div className="product-card" onClick={() => openProduct(product.id)} role="button" tabIndex={0}>
      <div className="product-card-img-shell">
        <MenuImageArea
          imageUrl={product.imageUrl}
          className="product-card-img-wrap"
          alt={product.name}
          sizes="112px"
        />
        {isPromo ? (
          <ProductPromoChip originalPrice={product.promoOriginalPrice} promoPrice={product.price} />
        ) : highlightLabel ? (
          <ProductPromoChip label={highlightLabel} />
        ) : null}
      </div>
      <div className="product-card-body">
        <div className="product-card-title">{product.name}</div>
        <div className="product-card-desc">{product.desc}</div>
        <div
          className={`product-card-price${isPromo ? ' has-promo' : ''}${showFromPrice ? ' is-from-price' : ''}`}
        >
          {isPromo ? (
            <>
              <span className="product-price-original">{formatPrice(product.promoOriginalPrice)}</span>
              <span className="product-price-promo">{formatPrice(product.price)}</span>
            </>
          ) : (
            <>
              {showFromPrice ? <span className="product-price-from">{product.priceLabel}</span> : null}
              <span className="product-price-value">{formatPrice(product.price)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
