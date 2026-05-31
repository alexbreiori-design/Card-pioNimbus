'use client';

import AdminIcon from '@/components/admin/AdminIcon';
import OrderStatusTimeline from './OrderStatusTimeline';
import { currency } from './orderDraftUtils';

const TIPO_LABEL = { delivery: 'Delivery', retirada: 'Retirada', balcao: 'Balcão' };
const STATUS_LABEL = {
  novo: 'Pedido recebido',
  em_preparo: 'Em preparo',
  saiu_entrega: 'Saiu para entrega',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};
const PAYMENT_LABEL = {
  debito: 'Débito',
  credito: 'Crédito',
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  vale: 'Vale refeição',
};

function deadlineLabel(order) {
  if (order.tipo === 'delivery') return `Entregar até ${order.prazo || '--:--'}`;
  return `Retirar até ${order.prazo || '--:--'}`;
}

function addressText(order) {
  if (order.tipo !== 'delivery') {
    return order.tipo === 'retirada' ? 'Retirada no estabelecimento' : 'Balcão';
  }
  if (order.enderecoTexto) return order.enderecoTexto;
  const e = order.endereco || {};
  return `${e.logradouro || ''}${e.numero ? `, ${e.numero}` : ''} - ${e.bairro || ''} - ${e.cidade || ''}`.trim();
}

export default function OrderDetailModal({
  order,
  paymentLabel,
  onClose,
  onEdit,
  onPrint,
  onCancel,
  onAdvance,
  canAdvance,
  advanceLabel,
  readOnly = false,
}) {
  if (!order) return null;
  const pay = paymentLabel || PAYMENT_LABEL[order.pagamento?.metodo] || order.pagamento?.metodo || '—';

  return (
    <div className="admin-confirm-overlay" onClick={onClose}>
      <div className="admin-order-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-order-detail-head">
          <div>
            <span className="admin-order-detail-kicker">Pedido #{order.id}</span>
            <h2>{order.clienteNome}</h2>
            <span className={`admin-order-detail-status admin-order-detail-status-${order.status}`}>
              {STATUS_LABEL[order.status] || order.status}
            </span>
          </div>
          <button type="button" className="admin-order-detail-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="admin-order-detail-highlight">
          <div>
            <span>Total do pedido</span>
            <strong>{currency(order.total)}</strong>
          </div>
          <div>
            <span>Prazo</span>
            <strong>{deadlineLabel(order)}</strong>
          </div>
        </div>

        <OrderStatusTimeline status={order.status} historico={order.historico} />

        <div className="admin-order-detail-grid">
          <div className="admin-order-detail-card">
            <div className="admin-order-detail-row">
              <AdminIcon name="customer" />
              <div>
                <span>Cliente</span>
                <strong>{order.clienteNome}</strong>
              </div>
            </div>
            <div className="admin-order-detail-row">
              <AdminIcon name="phone" />
              <div>
                <span>Telefone</span>
                <strong>{order.clienteTelefone || '—'}</strong>
              </div>
            </div>
          </div>

          <div className="admin-order-detail-card">
            <div className="admin-order-detail-row">
              <AdminIcon name="location" />
              <div>
                <span>{TIPO_LABEL[order.tipo] || order.tipo}</span>
                <strong>{addressText(order)}</strong>
              </div>
            </div>
            <div className="admin-order-detail-row">
              <AdminIcon name="coupon" />
              <div>
                <span>Pagamento</span>
                <strong>{pay}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-order-detail-card">
          <h3>
            <AdminIcon name="cart" />
            Itens do pedido
          </h3>
          {(order.itens || []).map((item, idx) => (
            <div key={`${item.nome}-${idx}`} className="admin-order-detail-item">
              <div>
                <strong>
                  {item.qtd}x {item.nome}
                </strong>
                {item.obs ? <span>{item.obs}</span> : null}
              </div>
              <strong>{currency(item.subtotal)}</strong>
            </div>
          ))}
          <div className="admin-order-detail-totals">
            {order.subtotal > 0 ? (
              <div>
                <span>Subtotal</span>
                <span>{currency(order.subtotal)}</span>
              </div>
            ) : null}
            {order.frete > 0 ? (
              <div>
                <span>Entrega</span>
                <span>{currency(order.frete)}</span>
              </div>
            ) : null}
            {order.desconto > 0 ? (
              <div>
                <span>Desconto{order.cupomCodigo ? ` (${order.cupomCodigo})` : ''}</span>
                <span>-{currency(order.desconto)}</span>
              </div>
            ) : null}
            <div className="final">
              <span>Total</span>
              <span>{currency(order.total)}</span>
            </div>
          </div>
        </div>

        {readOnly ? null : (
        <div className="admin-order-detail-actions">
          {canAdvance ? (
            <button type="button" className="admin-btn admin-btn-primary" onClick={onAdvance}>
              {advanceLabel}
            </button>
          ) : null}
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onEdit}>
            Editar pedido
          </button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onPrint}>
            Imprimir
          </button>
          <button type="button" className="admin-btn admin-btn-danger" onClick={onCancel}>
            Cancelar pedido
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
