'use client';

import AdminIcon from '@/components/admin/AdminIcon';
import { currency } from './orderDraftUtils';

export default function OrderCartDock({ cart, setDraft }) {
  if (!cart.length) return null;

  return (
    <div className="admin-new-order-cart-dock" aria-label="Itens do pedido">
      {cart.map((item) => (
        <div key={item.id} className="admin-new-order-cart-row">
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
          <span className="admin-new-order-cart-name" title={item.nome}>
            {item.nome}
            {item.medida ? ` (${item.medida})` : ''}
          </span>
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
      ))}
    </div>
  );
}
