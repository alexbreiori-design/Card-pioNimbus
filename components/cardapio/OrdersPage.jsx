'use client';

import { useState } from 'react';
import { useCardapio } from '@/context/CardapioContext';
import { buildStoreWhatsAppOrderUrl } from '@/lib/storeWhatsApp';

const STATUS_STEPS = [
  ['novo', 'Recebido'],
  ['em_preparo', 'Preparo'],
  ['saiu_entrega', 'Entrega'],
  ['concluido', 'Concluído'],
];

const STATUS_LABEL = {
  novo: 'Recebido',
  em_preparo: 'Em preparo',
  saiu_entrega: 'Saiu para entrega',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

function statusIndex(status) {
  return Math.max(0, STATUS_STEPS.findIndex(([key]) => key === status));
}

export default function OrdersPage() {
  const {
    page,
    publicOrders,
    formatPrice,
    storeConfig,
    profileDisplayName,
    clearPublicOrderHistory,
  } = useCardapio();
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const openOrders = publicOrders.filter((order) => !['concluido', 'cancelado'].includes(order.status));
  const historyOrders = publicOrders.filter((order) => ['concluido', 'cancelado'].includes(order.status));

  function etaLabel(order) {
    if (!order.entregarAte) return order.prazo ? `Previsão: ${order.prazo}` : '';
    return `Previsão: ${new Date(order.entregarAte).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  function customerNameForOrder(order) {
    return order.clienteNome || profileDisplayName || 'cliente';
  }

  function renderWhatsAppButton(order) {
    const url = buildStoreWhatsAppOrderUrl(storeConfig, {
      customerName: customerNameForOrder(order),
      orderId: order.id,
    });
    if (!url) return null;
    return (
      <a
        className="btn-falar-loja"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        Falar com a Loja
      </a>
    );
  }

  function renderActiveOrder(order) {
    const current = statusIndex(order.status);
    const progress = current <= 0 ? 12 : ((current + 1) / STATUS_STEPS.length) * 100;
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
            {STATUS_STEPS.map(([key, label], idx) => (
              <span key={key} className={idx <= current ? 'active' : ''}>
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="order-track-info">
          <strong>{order.tipo === 'delivery' ? 'Entrega' : 'Retirada'}</strong>
          <span>{order.enderecoTexto}</span>
        </div>
        {(order.itens || []).map((item, idx) => (
          <div key={`${order.id}-${item.nome}-${idx}`} className="order-track-item">
            <span>
              {item.qtd}x {item.nome}
            </span>
            <span>{formatPrice(item.subtotal)}</span>
          </div>
        ))}
        {renderWhatsAppButton(order)}
      </div>
    );
  }

  function renderHistoryOrder(order) {
    const isCancelled = order.status === 'cancelado';
    return (
      <div key={order.id} className={`profile-form order-track-card ${isCancelled ? 'order-track-cancelled' : ''}`}>
        <div className="order-track-head">
          <div>
            <div className="profile-form-title">Pedido #{order.id}</div>
            <div className={`order-track-sub ${isCancelled ? 'order-track-status-cancelled' : ''}`}>
              {STATUS_LABEL[order.status] || order.status}
            </div>
          </div>
          <strong>{formatPrice(order.total)}</strong>
        </div>
        {!isCancelled ? (
          <div className="order-track-info">
            <strong>{order.tipo === 'delivery' ? 'Entrega' : 'Retirada'}</strong>
            <span>{order.enderecoTexto}</span>
          </div>
        ) : (
          <div className="order-track-info">
            <strong>Pedido cancelado</strong>
            <span>Este pedido foi cancelado pela loja.</span>
          </div>
        )}
        {(order.itens || []).map((item, idx) => (
          <div key={`${order.id}-${item.nome}-${idx}`} className="order-track-item">
            <span>
              {item.qtd}x {item.nome}
            </span>
            <span>{formatPrice(item.subtotal)}</span>
          </div>
        ))}
      </div>
    );
  }

  function handleConfirmClearHistory() {
    clearPublicOrderHistory();
    setClearConfirmOpen(false);
  }

  return (
    <div id="ordersPage" className={`profile-page ${page === 'orders' ? 'open' : ''}`}>
      <div className="page-wrapper profile-wrapper">
        <div className="profile-form" style={{ marginTop: 18 }}>
          <div className="profile-form-title">Pedidos em andamento</div>
          {openOrders.length === 0 ? (
            <p style={{ color: 'var(--text-light)' }}>Você ainda não tem pedidos em andamento.</p>
          ) : (
            openOrders.map(renderActiveOrder)
          )}
        </div>
        <div className="profile-form" style={{ marginTop: 14 }}>
          <div className="orders-section-head">
            <div className="profile-form-title" style={{ marginBottom: 0 }}>
              Histórico
            </div>
            {historyOrders.length > 0 ? (
              <button
                type="button"
                className="orders-clear-link"
                onClick={() => setClearConfirmOpen(true)}
              >
                Limpar histórico
              </button>
            ) : null}
          </div>
          {historyOrders.length === 0 ? (
            <p style={{ color: 'var(--text-light)', marginTop: 16 }}>Nenhum pedido finalizado ainda.</p>
          ) : (
            historyOrders.map(renderHistoryOrder)
          )}
        </div>
      </div>

      {clearConfirmOpen ? (
        <div
          className="generic-overlay open"
          role="presentation"
          onClick={() => setClearConfirmOpen(false)}
        >
          <div
            className="modal-card app-dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-history-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-body" style={{ padding: '22px 20px' }}>
              <p id="clear-history-title" className="app-dialog-message orders-clear-message">
                A limpeza do histórico é válida apenas para o cliente. A loja ainda terá o seu histórico de
                pedidos.
                <br />
                <br />
                Deseja continuar com a limpeza?
              </p>
            </div>
            <div className="modal-footer orders-clear-footer">
              <button
                type="button"
                className="btn-modal-cancel-outline"
                onClick={() => setClearConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button type="button" className="btn-modal-danger" onClick={handleConfirmClearHistory}>
                Sim
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
