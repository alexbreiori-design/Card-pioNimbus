'use client';

import { useCardapio } from '@/context/CardapioContext';

export default function OrdersPage() {
  const { page, publicOrders, formatPrice } = useCardapio();

  const statusSteps = [
    ['novo', 'Recebido'],
    ['em_preparo', 'Preparo'],
    ['saiu_entrega', 'Entrega'],
    ['concluido', 'Concluído'],
  ];
  const statusIndex = (status) => Math.max(0, statusSteps.findIndex(([key]) => key === status));
  const openOrders = publicOrders.filter((order) => !['concluido', 'cancelado'].includes(order.status));
  const historyOrders = publicOrders.filter((order) => ['concluido', 'cancelado'].includes(order.status));

  function etaLabel(order) {
    if (!order.entregarAte) return order.prazo ? `Previsão: ${order.prazo}` : '';
    return `Previsão: ${new Date(order.entregarAte).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  function renderOrder(order) {
    const current = statusIndex(order.status);
    const progress = current <= 0 ? 12 : ((current + 1) / statusSteps.length) * 100;
    return (
      <div key={order.id} className="profile-form order-track-card">
        <div className="order-track-head">
          <div>
            <div className="profile-form-title">Pedido #{order.id}</div>
            <div className="order-track-sub">{etaLabel(order)}</div>
          </div>
          <strong>{formatPrice(order.total)}</strong>
        </div>
        <div className="order-progress">
          <div className="order-progress-bar">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="order-progress-steps">
            {statusSteps.map(([key, label], idx) => (
              <span key={key} className={idx <= current ? 'active' : ''}>{label}</span>
            ))}
          </div>
        </div>
        <div className="order-track-info">
          <strong>{order.tipo === 'delivery' ? 'Entrega' : 'Retirada'}</strong>
          <span>{order.enderecoTexto}</span>
        </div>
        {(order.itens || []).map((item, idx) => (
          <div key={`${order.id}-${item.nome}-${idx}`} className="order-track-item">
            <span>{item.qtd}x {item.nome}</span>
            <span>{formatPrice(item.subtotal)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div id="ordersPage" className={`profile-page ${page === 'orders' ? 'open' : ''}`}>
      <div className="page-wrapper profile-wrapper">
        <div className="profile-form" style={{ marginTop: 18 }}>
          <div className="profile-form-title">Pedidos em andamento</div>
          {openOrders.length === 0 ? (
            <p style={{ color: 'var(--text-light)' }}>
              Você ainda não tem pedidos em andamento.
            </p>
          ) : (
            openOrders.map(renderOrder)
          )}
        </div>
        <div className="profile-form" style={{ marginTop: 14 }}>
          <div className="profile-form-title">Histórico</div>
          {historyOrders.length === 0 ? (
            <p style={{ color: 'var(--text-light)' }}>Nenhum pedido finalizado ainda.</p>
          ) : (
            historyOrders.map(renderOrder)
          )}
        </div>
      </div>
    </div>
  );
}
