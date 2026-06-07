'use client';

import { formatCartOptsList } from '@/lib/cardapio/formatCartOpts';

import { useRef } from 'react';
import { useCardapio } from '@/context/CardapioContext';
import { calculateCupomDiscount } from '@/lib/cupons';
import { IconCupom, IconChevron } from './icons';

function AlsoCarousel({ items, formatPrice, onOpen }) {
  const scrollRef = useRef(null);

  function scrollBy(direction) {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(160, Math.floor(el.clientWidth * 0.7));
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  }

  return (
    <div className="sacola-also-carousel">
      <button
        type="button"
        className="sacola-also-nav prev"
        onClick={() => scrollBy(-1)}
        aria-label="Ver sugestões anteriores"
      >
        <IconChevron />
      </button>
      <div className="sacola-also-scroll" ref={scrollRef}>
        {items.map((a) => (
          <button type="button" className="also-item" key={a.id} onClick={() => onOpen(a.id)}>
            <div
              className={`also-item-img ${a.imageUrl ? 'has-image' : 'is-placeholder'}`}
              style={a.imageUrl ? { backgroundImage: `url(${a.imageUrl})` } : undefined}
            />
            <div className="also-item-name">{a.name}</div>
            <div className="also-item-price">{formatPrice(a.price)}</div>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="sacola-also-nav next"
        onClick={() => scrollBy(1)}
        aria-label="Ver mais sugestões"
      >
        <IconChevron />
      </button>
    </div>
  );
}

export default function SacolaPanel({ onFinalize, finalizeLabel = 'Finalizar pedido', onAddMore }) {
  const {
    cart,
    cartSubtotal,
    cartTotal,
    appliedCupom,
    deliveryFee,
    currentDeliveryMode,
    formatPrice,
    relatedItems,
    clearCart,
    removeCartItem,
    editCartItem,
    openCupomPopup,
    openProduct,
    isStoreOpen,
    storeConfig,
  } = useCardapio();

  const subtotal = cartSubtotal();
  const isDelivery = currentDeliveryMode === 'entregar';
  const fee = isDelivery ? Number(deliveryFee) || 0 : 0;
  const minOrder = Number(storeConfig?.pedidoMinimo || 0);
  const cupomOff = calculateCupomDiscount(appliedCupom, subtotal);
  const total = cartTotal();
  const empty = cart.length === 0;

  return (
    <>
      <div id="sacolaContent" className="sacola-panel-content">
        {empty ? (
          <div className="sacola-empty">
            <div className="bag-icon">
              <svg viewBox="0 0 24 24">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <span>Sacola vazia</span>
          </div>
        ) : (
          <>
            <div className="sacola-header">
              <h3>Sua sacola</h3>
              <button type="button" className="limpar-btn" onClick={clearCart}>
                LIMPAR
              </button>
            </div>
            {cart.map((item) => (
              <div className="sacola-item" key={item.id}>
                <div className="sacola-item-info">
                  <div className="sacola-item-qty">{item.qty}x</div>
                  <div className="sacola-item-name">{item.name}</div>
                  <div className="sacola-item-opts">{formatCartOptsList(item.opts)}</div>
                  <div className="sacola-item-actions">
                    <button type="button" onClick={() => editCartItem(item.id)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeCartItem(item.id)}
                    >
                      Remover
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div className="sacola-item-price">{formatPrice(item.price * item.qty)}</div>
                  <div
                    className={`sacola-item-thumb ${item.imageUrl ? 'has-image' : 'is-placeholder'}`}
                    style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined}
                  />
                </div>
              </div>
            ))}
            {relatedItems.length > 0 ? (
              <>
                <div className="sacola-also-title">Peça também</div>
                <AlsoCarousel items={relatedItems} formatPrice={formatPrice} onOpen={openProduct} />
              </>
            ) : null}
            <div className="sacola-totals">
              {minOrder > 0 ? (
                <div className="totals-row totals-row--meta">
                  <span>Pedido mínimo</span>
                  <span>{formatPrice(minOrder)}</span>
                </div>
              ) : null}
              <div className="totals-row">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {isDelivery ? (
                <div className="totals-row">
                  <span>Taxa de entrega</span>
                  <span>{fee > 0 ? formatPrice(fee) : 'Grátis'}</span>
                </div>
              ) : null}
              {cupomOff > 0 ? (
                <div className="totals-row">
                  <span>Cupom ({appliedCupom.codigo})</span>
                  <span>− {formatPrice(cupomOff)}</span>
                </div>
              ) : null}
              <div className="totals-row total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </>
        )}
      </div>
      {!empty ? (
        <div className="sacola-panel-footer">
          <div className="cupom-row" onClick={openCupomPopup} role="button" tabIndex={0}>
            <span className="cupom-icon">
              <IconCupom />
            </span>
            <span className="cupom-info">
              <div className="cupom-title">
                {appliedCupom ? `Cupom ${appliedCupom.codigo} aplicado` : 'Tem um cupom?'}
              </div>
              <div className="cupom-sub">
                {appliedCupom
                  ? `Desconto de ${formatPrice(appliedCupom.valorDesconto)}`
                  : 'Clique e insira o código'}
              </div>
            </span>
            <span className="cupom-chev">
              <IconChevron />
            </span>
          </div>
          {onAddMore ? (
            <button type="button" className="btn-sacola-secondary" onClick={onAddMore}>
              Adicionar mais itens
            </button>
          ) : null}
          <button
            type="button"
            className="btn-continuar"
            disabled={!isStoreOpen}
            onClick={onFinalize}
          >
            {!isStoreOpen ? 'Loja fechada no momento' : finalizeLabel}
          </button>
        </div>
      ) : null}
    </>
  );
}
