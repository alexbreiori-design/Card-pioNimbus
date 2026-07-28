'use client';

import { useEffect, useRef } from 'react';
import AdminIcon from '@/components/admin/AdminIcon';
import { currency } from './orderDraftUtils';

function formatCartSummary(item) {
  const parts = [];
  if (item.medida) parts.push(item.medida);
  const obs = String(item.obs || '').trim();
  if (obs) parts.push(obs.replace(/\n/g, ' · '));
  return parts.join(' · ');
}

export default function OrderCartList({ cart, setDraft, onEditItem }) {
  const endRef = useRef(null);
  const prevLenRef = useRef(0);

  useEffect(() => {
    if (cart.length > prevLenRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    prevLenRef.current = cart.length;
  }, [cart.length]);

  if (!cart.length) return null;

  return (
    <div className="admin-new-order-cart-list" aria-label="Itens do pedido">
      {cart.map((item, index) => {
        const summary = formatCartSummary(item);
        const canEdit = Boolean(item.config) && typeof onEditItem === 'function';
        return (
          <div key={item.id} className="admin-new-order-cart-item">
            <div className="admin-new-order-cart-row">
              <span className="admin-new-order-cart-index">{index + 1}.</span>
              <div className="admin-new-order-cart-main">
                <div className="admin-new-order-cart-title-row">
                  <span className="admin-new-order-cart-name" title={item.nome}>
                    {item.nome}
                  </span>
                  {canEdit ? (
                    <button
                      type="button"
                      className="admin-new-order-cart-edit"
                      aria-label={`Editar montagem de ${item.nome}`}
                      title="Editar montagem"
                      onClick={() => onEditItem(item)}
                    >
                      <AdminIcon name="edit" />
                    </button>
                  ) : null}
                </div>
                {summary ? <p className="admin-new-order-cart-summary">{summary}</p> : null}
              </div>
              <div className="admin-new-order-cart-qty">
                <button
                  type="button"
                  className="admin-new-order-cart-qty-btn"
                  aria-label={`Diminuir quantidade de ${item.nome}`}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      cart: d.cart.map((x) =>
                        x.id === item.id ? { ...x, qtd: Math.max(1, x.qtd - 1) } : x
                      ),
                    }))
                  }
                >
                  −
                </button>
                <span className="admin-new-order-cart-qty-value">{item.qtd}</span>
                <button
                  type="button"
                  className="admin-new-order-cart-qty-btn"
                  aria-label={`Aumentar quantidade de ${item.nome}`}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      cart: d.cart.map((x) => (x.id === item.id ? { ...x, qtd: x.qtd + 1 } : x)),
                    }))
                  }
                >
                  +
                </button>
              </div>
              <span className="admin-new-order-cart-price">{currency(item.qtd * item.preco)}</span>
              <button
                type="button"
                className="admin-new-order-cart-remove"
                aria-label={`Remover ${item.nome}`}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    cart: d.cart.filter((x) => x.id !== item.id),
                  }))
                }
              >
                <i className="ph ph-trash" aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
      <div ref={endRef} className="admin-new-order-cart-end" aria-hidden="true" />
    </div>
  );
}
