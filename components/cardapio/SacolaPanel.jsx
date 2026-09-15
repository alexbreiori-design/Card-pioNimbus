'use client';

import CartItemOptsList from '@/components/cardapio/CartItemOptsList';

import { useLayoutEffect, useRef } from 'react';
import { useCardapio } from '@/context/CardapioContext';
import { calculateCupomDiscount } from '@/lib/cupons';
import { IconChevron } from './icons';
import MenuImageArea from '@/components/cardapio/MenuImageArea';

const SACOLA_ITEMS_PEEK_PX = 28;
const SACOLA_VISIBLE_ITEMS = 3;

function AlsoSuggestions({ items, formatPrice, onOpen }) {
  if (!items.length) return null;

  const columns = Math.min(5, items.length);

  return (
    <div
      className="sacola-also-grid"
      role="list"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((a) => (
        <button
          type="button"
          className="also-item"
          key={a.id}
          role="listitem"
          onClick={() => onOpen(a.id)}
        >
          <MenuImageArea
            imageUrl={a.imageUrl}
            className="also-item-img"
            alt={a.name}
            sizes="20vw"
          />
          <div className="also-item-name">{a.name}</div>
          <div className="also-item-price">{formatPrice(a.price)}</div>
        </button>
      ))}
    </div>
  );
}

function CartItemQty({ item, inlineQtyControls, changeCartItemQty }) {
  if (inlineQtyControls) {
    return (
      <div className="sacola-item-qty-stepper">
        <button
          type="button"
          className="sacola-item-qty-btn"
          onClick={() => changeCartItemQty(item.id, -1)}
          aria-label={`Diminuir quantidade de ${item.name}`}
        >
          −
        </button>
        <span className="sacola-item-qty-value">{item.qty}</span>
        <button
          type="button"
          className="sacola-item-qty-btn"
          onClick={() => changeCartItemQty(item.id, 1)}
          aria-label={`Aumentar quantidade de ${item.name}`}
        >
          +
        </button>
      </div>
    );
  }

  return <div className="sacola-item-qty">{item.qty}x</div>;
}

export default function SacolaPanel({
  onFinalize,
  finalizeLabel = 'Finalizar pedido',
  onAddMore,
  orderTerminology = false,
  promoCupomIcon: _promoCupomIcon = false,
  cartEmptyIcon = false,
  inlineQtyControls = false,
}) {
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
    changeCartItemQty,
    openCupomPopup,
    openProduct,
    canFinalizeCart,
    storeConfig,
  } = useCardapio();

  const subtotal = cartSubtotal();
  const isDelivery = currentDeliveryMode === 'entregar';
  const fee = isDelivery ? Number(deliveryFee) || 0 : 0;
  const minOrder = Number(storeConfig?.pedidoMinimo || 0);
  const cupomOff = calculateCupomDiscount(appliedCupom, subtotal);
  const total = cartTotal();
  const empty = cart.length === 0;
  const emptyLabel = orderTerminology ? 'Pedido vazio' : 'Sacola vazia';
  const headerLabel = orderTerminology ? 'Seu pedido' : 'Sua sacola';
  const itemsShellRef = useRef(null);
  const itemsWrapRef = useRef(null);
  const itemsListRef = useRef(null);

  useLayoutEffect(() => {
    const shell = itemsShellRef.current;
    const wrap = itemsWrapRef.current;
    const list = itemsListRef.current;
    if (!shell || !wrap || !list) return undefined;

    const panel = shell.closest('.sacola-panel');

    const clearWrapSize = () => {
      wrap.style.height = '';
      wrap.style.maxHeight = '';
      shell.classList.remove('is-scrollable', 'has-fade');
    };

    const updateFade = () => {
      if (!shell.classList.contains('is-scrollable')) {
        shell.classList.remove('has-fade');
        return;
      }
      const remaining = wrap.scrollHeight - wrap.clientHeight - wrap.scrollTop;
      shell.classList.toggle('has-fade', remaining > 2);
    };

    const measure = () => {
      // Mede sem altura fixa para saber o tamanho natural da lista.
      wrap.style.height = '';
      wrap.style.maxHeight = '';
      shell.classList.remove('is-scrollable', 'has-fade');

      const rows = list.querySelectorAll(':scope > .sacola-item');
      if (!rows.length) {
        clearWrapSize();
        return;
      }

      const listHeight = Math.ceil(list.getBoundingClientRect().height);
      const headerEl = panel?.querySelector('.sacola-header');
      const stickyEl = panel?.querySelector('.sacola-panel-sticky');
      const used =
        (headerEl?.getBoundingClientRect().height || 0) +
        (stickyEl?.getBoundingClientRect().height || 0);
      const panelH = panel?.clientHeight || 0;
      const availableFromPanel =
        panelH > 0 ? Math.max(88, Math.floor(panelH - used)) : Number.POSITIVE_INFINITY;

      // Preferência visual: no máximo ~3 itens + peek quando há muitos.
      let desired = listHeight;
      if (rows.length > SACOLA_VISIBLE_ITEMS) {
        let threeHeight = 0;
        for (let i = 0; i < SACOLA_VISIBLE_ITEMS; i += 1) {
          threeHeight += rows[i].getBoundingClientRect().height;
        }
        desired = Math.ceil(threeHeight + SACOLA_ITEMS_PEEK_PX);
      }

      const capped = Math.max(88, Math.min(desired, availableFromPanel));
      const needsScroll = listHeight > capped + 2;

      if (!needsScroll) {
        clearWrapSize();
        return;
      }

      shell.classList.add('is-scrollable');
      wrap.style.maxHeight = `${capped}px`;
      wrap.style.height = `${capped}px`;
      updateFade();
    };

    measure();
    wrap.addEventListener('scroll', updateFade, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(list);
    if (panel) ro?.observe(panel);
    const stickyEl = panel?.querySelector('.sacola-panel-sticky');
    if (stickyEl) ro?.observe(stickyEl);

    return () => {
      wrap.removeEventListener('scroll', updateFade);
      ro?.disconnect();
    };
  }, [cart]);

  return (
    <div className={`sacola-panel${empty ? ' is-empty' : ''}`}>
      <div id="sacolaContent" className="sacola-panel-content">
        {empty ? (
          <div className="sacola-empty">
            <div className={`bag-icon${cartEmptyIcon ? ' bag-icon--cart' : ''}`}>
              {cartEmptyIcon ? (
                <i className="ph ph-shopping-cart" aria-hidden="true" />
              ) : (
                <svg viewBox="0 0 24 24">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              )}
            </div>
            <span>{emptyLabel}</span>
          </div>
        ) : (
          <>
            <div className="sacola-header">
              <h3>{headerLabel}</h3>
              <button type="button" className="limpar-btn" onClick={clearCart}>
                LIMPAR
              </button>
            </div>
            <div ref={itemsShellRef} className="sacola-items-shell">
              <div className="sacola-items-wrap" ref={itemsWrapRef}>
                <div className="sacola-items" role="list" ref={itemsListRef}>
                  {cart.map((item) => (
                    <div className="sacola-item" key={item.id} role="listitem">
                      <MenuImageArea
                        imageUrl={item.imageUrl}
                        className="sacola-item-thumb"
                        alt={item.name}
                        sizes="56px"
                      />
                      <div className="sacola-item-info">
                        <div className="sacola-item-name">{item.name}</div>
                        <CartItemOptsList opts={item.opts} note={item.note} className="sacola-item-opts" />
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
                      <div className="sacola-item-side">
                        <CartItemQty
                          item={item}
                          inlineQtyControls={inlineQtyControls}
                          changeCartItemQty={changeCartItemQty}
                        />
                        <div className="sacola-item-price">{formatPrice(item.price * item.qty)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="sacola-items-fade" aria-hidden="true" />
            </div>
          </>
        )}
      </div>
      {!empty ? (
        <div className="sacola-panel-sticky">
          {relatedItems.length > 0 ? (
            <div className="sacola-also">
              <div className="sacola-also-title">Adicione ao pedido</div>
              <AlsoSuggestions items={relatedItems} formatPrice={formatPrice} onOpen={openProduct} />
            </div>
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
          <div className="sacola-panel-footer">
            <div className="cupom-row" onClick={openCupomPopup} role="button" tabIndex={0}>
              <span className="cupom-icon" aria-hidden="true">
                <i className="ph ph-ticket" />
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
            <div className={`sacola-panel-footer-actions${onAddMore ? ' has-add-more' : ''}`}>
              {onAddMore ? (
                <button type="button" className="btn-sacola-secondary" onClick={onAddMore}>
                  Adicionar mais itens
                </button>
              ) : null}
              <button
                type="button"
                className="btn-continuar"
                disabled={!canFinalizeCart}
                onClick={onFinalize}
              >
                {!canFinalizeCart ? 'Loja fechada no momento' : finalizeLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
