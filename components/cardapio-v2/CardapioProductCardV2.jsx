'use client';

import { useCardapio } from '@/context/CardapioContext';
import MenuImageArea from '@/components/cardapio/MenuImageArea';

export default function CardapioProductCardV2({ product, layout = 'rail' }) {
  const { addProductFromCard, formatPrice } = useCardapio();
  const isPromo = product.isPromocao && product.promoOriginalPrice > product.price;

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
      </div>
      <div className="cardapio-v2-product-card-body">
        <h3 className="cardapio-v2-product-card-title">{product.name}</h3>
        <p className={`cardapio-v2-product-card-desc${product.desc ? '' : ' is-empty'}`}>
          {product.desc || ''}
        </p>
        <div className="cardapio-v2-product-card-footer">
          <div className={`cardapio-v2-product-card-price${isPromo ? ' has-promo' : ''}`}>
            {isPromo ? (
              <>
                <span className="product-price-original">{formatPrice(product.promoOriginalPrice)}</span>
                <span className="product-price-promo">{formatPrice(product.price)}</span>
              </>
            ) : (
              <>
                {product.priceLabel ? (
                  <span className="product-price-from">{product.priceLabel} </span>
                ) : null}
                {formatPrice(product.price)}
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
