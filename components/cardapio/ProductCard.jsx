'use client';

import { useCardapio } from '@/context/CardapioContext';
import MenuImageArea from '@/components/cardapio/MenuImageArea';
import ProductPromoChip from '@/components/cardapio/ProductPromoChip';

export default function ProductCard({ product }) {
  const { openProduct, formatPrice } = useCardapio();
  const isPromo = product.isPromocao && product.promoOriginalPrice > product.price;

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
        ) : null}
      </div>
      <div className="product-card-body">
        <div className="product-card-title">{product.name}</div>
        <div className="product-card-desc">{product.desc}</div>
        <div className={`product-card-price ${isPromo ? 'has-promo' : ''}`}>
          {isPromo ? (
            <>
              <span className="product-price-original">{formatPrice(product.promoOriginalPrice)}</span>
              <span className="product-price-promo">{formatPrice(product.price)}</span>
            </>
          ) : (
            <>
              {product.priceLabel ? <span className="product-price-from">{product.priceLabel} </span> : null}
              {formatPrice(product.price)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
