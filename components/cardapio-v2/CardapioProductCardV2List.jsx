'use client';

import { useCardapio } from '@/context/CardapioContext';
import MenuImageArea from '@/components/cardapio/MenuImageArea';

export default function CardapioProductCardV2List({ product, layout = 'rail' }) {
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
      className={`cardapio-v2-product-card-list${layout === 'grid' ? ' is-grid' : ''}`}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <MenuImageArea
        imageUrl={product.imageUrl}
        className="cardapio-v2-product-card-list-media"
        alt={product.name}
        sizes="120px"
      />
      <div className="cardapio-v2-product-card-list-body">
        <h3 className="cardapio-v2-product-card-list-title">{product.name}</h3>
        {product.desc ? (
          <p className="cardapio-v2-product-card-list-desc">{product.desc}</p>
        ) : null}
        <div className="cardapio-v2-product-card-list-footer">
          <div className={`cardapio-v2-product-card-list-price${isPromo ? ' has-promo' : ''}`}>
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
            className="cardapio-v2-product-card-list-add"
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
