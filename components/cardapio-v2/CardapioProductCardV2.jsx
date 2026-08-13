'use client';

import { useCardapio } from '@/context/CardapioContext';
import MenuImageArea from '@/components/cardapio/MenuImageArea';
import ProductPromoChip from '@/components/cardapio/ProductPromoChip';

export default function CardapioProductCardV2({ product, layout = 'rail' }) {
  const { addProductFromCard, formatPrice } = useCardapio();
  const isPromo = product.isPromocao && product.promoOriginalPrice > product.price;
  const highlightLabel = !isPromo ? String(product.highlightLabel || '').trim() : '';
  const showFromPrice = Boolean(product.priceLabel) && !isPromo;

  function handleOpen() {
    addProductFromCard(product.id);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpen();
    }
  }

  function handleAddClick(event) {
    event.stopPropagation();
    handleOpen();
  }

  return (
    <article
      className={`cardapio-v2-product-card${layout === 'grid' ? ' is-grid' : ''}`}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="cardapio-v2-product-card-media">
        <MenuImageArea
          imageUrl={product.imageUrl}
          className="cardapio-v2-product-card-img"
          alt={product.name}
          sizes="(min-width: 1100px) 30vw, 33vw"
        />
        {isPromo ? (
          <ProductPromoChip originalPrice={product.promoOriginalPrice} promoPrice={product.price} />
        ) : highlightLabel ? (
          <ProductPromoChip label={highlightLabel} />
        ) : null}
      </div>
      <div className="cardapio-v2-product-card-body">
        <h3 className="cardapio-v2-product-card-title">{product.name}</h3>
        <p className={`cardapio-v2-product-card-desc${product.desc ? '' : ' is-empty'}`}>
          {product.desc || ''}
        </p>
        <div className="cardapio-v2-product-card-footer">
          <div
            className={`cardapio-v2-product-card-price${isPromo ? ' has-promo' : ''}${
              showFromPrice ? ' is-from-price' : ''
            }`}
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
          <button
            type="button"
            className="cardapio-v2-product-card-add"
            onClick={handleAddClick}
            aria-label={`Adicionar ${product.name}`}
          >
            <i className="ph-bold ph-plus" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
