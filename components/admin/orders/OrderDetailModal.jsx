'use client';

import CartItemOptsList from '@/components/cardapio/CartItemOptsList';
import AdminIcon from '@/components/admin/AdminIcon';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import { orderDeadlineHighlightClass } from '@/lib/orders/orderDeadline';
import { paymentStatusBadgeForOrder } from '@/lib/orders/mapAdminOrder';
import OrderDeadlineDemoEdit from './OrderDeadlineDemoEdit';
import OrderStatusTimeline from './OrderStatusTimeline';
import { currency, formatDistanceKm } from './orderDraftUtils';

const TIPO_LABEL = { delivery: 'Delivery', retirada: 'Retirada', balcao: 'Balcão' };
const STATUS_LABEL = {
  novo: 'Pedido recebido',
  em_preparo: 'Em preparo',
  saiu_entrega: 'Saiu para entrega',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
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
  whatsAppNotifyUrl = null,
  whatsAppSummaryUrl = null,
  onClose,
  onEdit,
  onPrint,
  onCancel,
  onAdvance,
  canAdvance,
  advanceLabel,
  readOnly = false,
  overlayClassName = '',
  demoDeadlineEdit = false,
  storeSlug = '',
  onDeadlineDemoUpdated,
}) {
  const { overlayPointerDown, overlayClick } = useAdminOverlayClose({
    onClose,
    isDirty: false,
  });

  if (!order) return null;
  const payBadge = paymentStatusBadgeForOrder(order);
  const deadlineClass = orderDeadlineHighlightClass(order);

  return (
    <div
      className={`admin-confirm-overlay ${overlayClassName}`.trim()}
      role="presentation"
      onPointerDown={overlayPointerDown}
      onClick={overlayClick}
    >
      <div className="admin-order-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-order-detail-head">
          <div>
            <span className="admin-order-detail-kicker">Pedido #{order.id}</span>
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
          <div className={deadlineClass}>
            <span>Prazo</span>
            <strong className="admin-order-detail-deadline-value">
              {deadlineLabel(order)}
              {demoDeadlineEdit ? (
                <OrderDeadlineDemoEdit
                  order={order}
                  storeSlug={storeSlug}
                  onUpdated={onDeadlineDemoUpdated}
                />
              ) : null}
            </strong>
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
                {formatDistanceKm(order.distanciaKm) ? (
                  <small className="admin-order-detail-distance">
                    Distância da rota: {formatDistanceKm(order.distanciaKm)}
                  </small>
                ) : null}
              </div>
            </div>
            {order.entregadorNome ? (
              <div className="admin-order-detail-row">
                <i className="ph ph-motorcycle admin-order-detail-phosphor" aria-hidden="true" />
                <div>
                  <span>Entregador</span>
                  <strong>{order.entregadorNome}</strong>
                </div>
              </div>
            ) : null}
            <div className="admin-order-detail-row">
              <AdminIcon name="coupon" />
              <div>
                <span>Pagamento</span>
                <span
                  className={`admin-order-detail-pay-badge admin-order-detail-pay-badge--${payBadge.kind}`}
                >
                  {payBadge.detailLabel}
                </span>
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
                <CartItemOptsList obs={item.obs} className="admin-order-detail-item-opts" />
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

        <div className="admin-order-detail-actions">
          {!readOnly && whatsAppSummaryUrl ? (
            <a
              className="admin-btn admin-btn-whatsapp admin-btn-whatsapp-outline admin-order-detail-btn-compact"
              href={whatsAppSummaryUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Enviar resumo
            </a>
          ) : null}
          {!readOnly && whatsAppNotifyUrl ? (
            <a
              className="admin-btn admin-btn-whatsapp admin-order-detail-btn-compact"
              href={whatsAppNotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Notificar status
            </a>
          ) : null}
          {!readOnly && canAdvance ? (
            <button type="button" className="admin-btn admin-btn-primary admin-order-detail-btn-compact" onClick={onAdvance}>
              {advanceLabel}
            </button>
          ) : null}
          {!readOnly ? (
            <>
              <button type="button" className="admin-btn admin-btn-ghost admin-order-detail-btn-compact" onClick={onEdit}>
                Editar pedido
              </button>
              <button type="button" className="admin-btn admin-btn-ghost admin-order-detail-btn-compact" onClick={onPrint}>
                Imprimir
              </button>
              <button type="button" className="admin-btn admin-btn-danger admin-order-detail-btn-compact" onClick={onCancel}>
                Cancelar pedido
              </button>
            </>
          ) : (
            <button type="button" className="admin-btn admin-btn-ghost admin-order-detail-btn-compact" onClick={onPrint}>
              Imprimir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
