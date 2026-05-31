'use client';

import { useCardapio } from '@/context/CardapioContext';
import { calculateCupomDiscount } from '@/lib/cupons';
import { IconCupom, IconChevron } from './icons';

export default function CartSidebar() {
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
    openCheckout,
    openCupomPopup,
    openProduct,
    isStoreOpen,
  } = useCardapio();

  const subtotal = cartSubtotal();
  const fee = currentDeliveryMode === 'entregar' ? Number(deliveryFee) || 0 : 0;
  const cupomOff = calculateCupomDiscount(appliedCupom, subtotal);
  const total = cartTotal();
  const empty = cart.length === 0;

  return (
    <div className="sidebar-col">
      <div className="sidebar-card">
        <div id="sacolaContent">
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
                    <div className="sacola-item-opts">{item.opts.join(', ')}</div>
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
                    <div className="sacola-item-price">
                      {formatPrice(item.price * item.qty)}
                    </div>
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
                  <div className="sacola-also-scroll">
                    {relatedItems.map((a) => (
                      <button type="button" className="also-item" key={a.id} onClick={() => openProduct(a.id)}>
                        <div
                          className={`also-item-img ${a.imageUrl ? 'has-image' : 'is-placeholder'}`}
                          style={a.imageUrl ? { backgroundImage: `url(${a.imageUrl})` } : undefined}
                        />
                        <div className="also-item-name">{a.name}</div>
                        <div className="also-item-price">{formatPrice(a.price)}</div>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              <div className="sacola-totals">
                <div className="totals-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {fee > 0 ? (
                  <div className="totals-row">
                    <span>Taxa de entrega</span>
                    <span>{formatPrice(fee)}</span>
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
        <div style={{ padding: '0 16px 4px', borderTop: '1px solid var(--border)' }}>
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
        </div>
        <button
          type="button"
          className="btn-continuar"
          disabled={empty || !isStoreOpen}
          onClick={openCheckout}
        >
          {!isStoreOpen ? 'Loja fechada no momento' : empty ? 'Sacola vazia' : 'Continuar pedido'}
        </button>
      </div>
    </div>
  );
}
