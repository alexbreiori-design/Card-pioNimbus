'use client';

import { useCardapio } from '@/context/CardapioContext';

export default function OrdersPage() {
  const { page, cart, formatPrice } = useCardapio();

  if (page !== 'orders') return null;

  return (
    <div className="page-wrapper profile-wrapper">
      <div className="profile-form" style={{ marginTop: 18 }}>
        <div className="profile-form-title">Pedidos</div>
        {cart.length === 0 ? (
          <p style={{ color: 'var(--text-light)' }}>
            Você ainda não tem pedidos em andamento neste dispositivo.
          </p>
        ) : (
          cart.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
              <div>
                <strong>{item.name}</strong>
                <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{item.qty}x</div>
              </div>
              <div>{formatPrice(item.price * item.qty)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

