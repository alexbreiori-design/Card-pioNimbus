'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { requestAdminNotificationPermission } from '@/lib/adminNewOrderAlert';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import NewOrderModal from '@/components/admin/orders/NewOrderModal';
import OrderDetailModal from '@/components/admin/orders/OrderDetailModal';
import AdminIcon from '@/components/admin/AdminIcon';
import AdminKanbanStatusIcon from '@/components/admin/AdminKanbanStatusIcon';
import {
  CaixaManageModal,
  CaixaPedidosChip,
} from '@/components/admin/caixa/CaixaPanels';
import { useAdminMobileAccess } from '@/hooks/useAdminMobileAccess';
import { useCaixa } from '@/hooks/useCaixa';
import {
  computeOrderTotals,
  currency,
  EMPTY_ORDER_DRAFT,
  fmtPhone,
} from '@/components/admin/orders/orderDraftUtils';
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import { useOrderPrint } from '@/context/OrderPrintContext';
import { paymentLabelForOrder } from '@/lib/orders/mapAdminOrder';
import { ensureCustomer, normalizePhone, updateCustomerStats, upsertClienteEndereco } from '@/lib/supabase/customers';
import { resolveEmpresaIdFromStore } from '@/lib/supabase/empresa';
import { getEtaFromConfirmedAt } from '@/lib/deliveryDuration';
import { buildOrderStatusNotifyUrl, buildOrderSummaryWhatsAppUrl } from '@/lib/orderWhatsApp';
import { formatOrderAgePt } from '@/lib/orderTimeAgo';
import {
  buildAdminOrderCatalogProducts,
  buildAdminOrderCategories,
} from '@/lib/admin/buildAdminCatalogProducts';

const DeliveryRoutesModal = dynamic(
  () => import('@/components/admin/delivery/DeliveryRoutesModal'),
  { ssr: false }
);

const COLS = [
  {
    key: 'novo',
    label: 'Novos',
    tone: 'blue',
    emptyTitle: 'Nenhum pedido novo',
    emptyDescription: 'Pedidos novos aparecerão aqui',
  },
  {
    key: 'em_preparo',
    label: 'Em preparo',
    tone: 'amber',
    emptyTitle: 'Nenhum pedido em preparo',
    emptyDescription: 'Pedidos em preparo aparecerão aqui',
  },
  {
    key: 'saiu_entrega',
    label: 'Saiu para entrega',
    tone: 'green',
    emptyTitle: 'Nenhum pedido para entrega',
    emptyDescription: 'Pedidos para entrega aparecerão aqui',
  },
];

const TYPE_FILTER_OPTIONS = [
  { key: 'todos', label: 'Todos' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'retirada', label: 'Retirada' },
  { key: 'balcao', label: 'Balcão' },
];

const TIPO_LABEL = { delivery: 'Delivery', retirada: 'Retirada', balcao: 'Balcão' };
const STATUS_LABEL = {
  novo: 'Pedido recebido',
  em_preparo: 'Em preparo',
  saiu_entrega: 'Saiu para entrega',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};
const STATUS_NEXT = {
  novo: 'em_preparo',
  em_preparo: 'saiu_entrega',
  saiu_entrega: 'concluido',
};
const STATUS_PREV = {
  em_preparo: 'novo',
  saiu_entrega: 'em_preparo',
};

const PAYMENT_LABEL = {
  debito: 'Débito',
  credito: 'Crédito',
  pix: 'Pix',
  dinheiro: 'Dinheiro',
};

function uid() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function deadlineLabel(order) {
  if (order.tipo === 'delivery') return `Entregar até ${order.prazo || '--:--'}`;
  return `Retirar até ${order.prazo || '--:--'}`;
}

function orderAdvanceLabel(order) {
  if (order.status === 'novo') return 'Avançar para preparo';
  if (order.status === 'em_preparo') {
    return order.tipo === 'delivery' ? 'Saiu para entrega' : 'Finalizar';
  }
  return 'Marcar como entregue';
}

function orderAdvanceIconClass(order) {
  if (order.status === 'saiu_entrega') return 'ph ph-check-circle';
  return 'ph ph-arrow-circle-right';
}

function OrderCardWhatsAppIcon({ className = '' }) {
  return (
    <svg className={`admin-order-card-whatsapp-svg ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

export default function PedidosPage() {
  const { data, saveData } = useAdminData();
  const {
    orders: allOrders,
    patchOrderStatus,
    cancelOrder,
    restoreArchived,
    createOrder,
    refreshOrders,
  } = useAdminOrders();
  const { printOrder } = useOrderPrint();
  const { isOpen: caixaOpen, loading: caixaLoading, turno: caixaTurno, canReopen, refresh: refreshCaixa } = useCaixa();
  const isMobile = useAdminMobileAccess();
  const caixaBlocked = !isMobile && !caixaLoading && !caixaOpen;

  const storeSlug = data.loja?.slug || '';
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const toast = useAdminToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [modalInitialDraft, setModalInitialDraft] = useState(null);
  const [detailOrderId, setDetailOrderId] = useState('');
  const [recentIds, setRecentIds] = useState([]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveDateFrom, setArchiveDateFrom] = useState('');
  const [archiveDateTo, setArchiveDateTo] = useState('');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [caixaManageModal, setCaixaManageModal] = useState(false);
  const [caixaManageView, setCaixaManageView] = useState('menu');
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const [routesOpen, setRoutesOpen] = useState(false);
  const typeFilterRef = useRef(null);

  useEffect(() => {
    void requestAdminNotificationPermission();
  }, []);

  useEffect(() => {
    if (!typeFilterOpen) return undefined;
    const close = (event) => {
      if (typeFilterRef.current && !typeFilterRef.current.contains(event.target)) {
        setTypeFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [typeFilterOpen]);

  function openCaixaManage(view = 'menu') {
    setCaixaManageView(view);
    setCaixaManageModal(true);
  }

  function guardCaixa() {
    if (isMobile || caixaOpen) return true;
    toast.error('Abra o caixa para continuar.');
    openCaixaManage(canReopen ? 'reabrir' : 'abrir');
    return false;
  }

  const products = useMemo(() => buildAdminOrderCatalogProducts(data), [data]);
  const categorias = useMemo(
    () => buildAdminOrderCategories(data, products),
    [data, products]
  );
  const orders = useMemo(() => allOrders.filter((o) => !o.arquivado), [allOrders]);

  const filteredOrders = useMemo(
    () =>
      orders.filter((o) => {
        const q = query.trim().toLowerCase();
        const qOk =
          !q ||
          String(o.id).toLowerCase().includes(q) ||
          String(o.clienteNome || '').toLowerCase().includes(q);
        const tOk = typeFilter === 'todos' || o.tipo === typeFilter;
        return qOk && tOk && o.status !== 'cancelado';
      }),
    [orders, query, typeFilter]
  );

  const countsByType = useMemo(
    () => ({
      todos: filteredOrders.length,
      delivery: filteredOrders.filter((o) => o.tipo === 'delivery').length,
      retirada: filteredOrders.filter((o) => o.tipo === 'retirada').length,
      balcao: filteredOrders.filter((o) => o.tipo === 'balcao').length,
    }),
    [filteredOrders]
  );

  function openNewOrderModal(initialDraft = null) {
    if (!guardCaixa()) return;
    setModalInitialDraft(initialDraft);
    setCreateOpen(true);
  }

  async function moveStatus(order) {
    if (!guardCaixa()) return;
    const next = STATUS_NEXT[order.status];
    if (!next) return;
    try {
      await patchOrderStatus(order, next);
      toast.success(`Pedido #${order.id} movido para ${STATUS_LABEL[next]}.`);
    } catch (error) {
      toast.error(error?.message || 'Erro ao atualizar pedido.');
    }
  }

  async function rollbackStatus(order) {
    if (!guardCaixa()) return;
    const prevStatus = STATUS_PREV[order.status];
    if (!prevStatus) return;
    try {
      await patchOrderStatus(order, prevStatus);
      toast.success(`Pedido #${order.id} voltou para ${STATUS_LABEL[prevStatus]}.`);
    } catch (error) {
      toast.error(error?.message || 'Erro ao atualizar pedido.');
    }
  }

  async function handleRestoreArchived(orderId) {
    if (!guardCaixa()) return;
    const order = allOrders.find((o) => String(o.id) === String(orderId));
    if (!order) return;
    try {
      await restoreArchived(order);
      toast.success(`Pedido #${orderId} restaurado em Saiu para entrega.`);
    } catch (error) {
      toast.error(error?.message || 'Erro ao restaurar pedido.');
    }
  }

  const concludedOrders = useMemo(() => {
    return allOrders
      .filter((o) => o.arquivado && o.status === 'concluido')
      .filter((o) => {
        if (!archiveDateFrom && !archiveDateTo) return true;
        const created = new Date(o.createdAt || 0).getTime();
        const from = archiveDateFrom ? new Date(`${archiveDateFrom}T00:00:00`).getTime() : null;
        const to = archiveDateTo ? new Date(`${archiveDateTo}T23:59:59`).getTime() : null;
        if (from && created < from) return false;
        if (to && created > to) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [allOrders, archiveDateFrom, archiveDateTo]);

  async function saveOrder(draft, printNow = false) {
    if (!guardCaixa()) return;
    const totals = computeOrderTotals(draft);
    const eta = getEtaFromConfirmedAt(new Date().toISOString(), data.loja, draft.tipo);
    const phoneDigits = normalizePhone(draft.telefone);
    const newOrder = {
      id: uid(),
      status: 'novo',
      tipo: draft.tipo,
      clienteNome: draft.clienteNome,
      clienteTelefone: phoneDigits,
      createdAt: new Date().toISOString(),
      prazo: eta.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      entregarAte: eta.toISOString(),
      enderecoTexto:
        draft.tipo === 'delivery'
          ? `${draft.logradouro || ''}${draft.numero ? `, ${draft.numero}` : ''} - ${draft.bairro || ''} - ${draft.cidade || ''}`
          : draft.tipo === 'retirada'
            ? 'Retirada no balcão'
            : 'Balcão',
      observacao: draft.observacao,
      subtotal: totals.subtotal,
      frete: totals.entrega,
      acrescimo: totals.acrescimo,
      desconto: totals.desconto,
      cupomCodigo: draft.cupomCodigo || '',
      total: totals.total,
      pagamento: { metodo: draft.formaPagamento, recebido: totals.total, troco: 0 },
      origem: 'admin_manual',
      itens: [],
      caixaTurnoId: caixaTurno?.id || null,
    };
    const items = draft.cart.map((i) => ({
      nome: i.nome,
      qtd: i.qtd,
      precoUnit: i.preco,
      subtotal: i.qtd * i.preco,
      obs: i.obs || '',
      produtoId: i.produtoId || null,
    }));
    newOrder.itens = items;

    try {
      const empresaId = await resolveEmpresaIdFromStore(storeSlug);
      const customer = await ensureCustomer({
        name: draft.clienteNome,
        phone: draft.telefone,
        empresaId,
      });
      const customerId = customer?.id || null;
      newOrder.cliente_id = customerId;

      await createOrder(newOrder, items);
      await refreshCaixa({ silent: true });

      if (customerId && empresaId) {
        await updateCustomerStats({ customerId, orderValue: newOrder.total, empresaId });
        if (draft.tipo === 'delivery') {
          await upsertClienteEndereco({
            clienteId: customerId,
            empresaId,
            patch: {
              cep: draft.cep,
              street: draft.logradouro,
              number: draft.numero,
              district: draft.bairro,
              city: draft.cidade,
              state: draft.estado,
              complement: draft.complemento,
              principal: true,
            },
          });
        }
      }

      saveData((prev) => {
        const previous = (prev.clientes || []).find(
          (cliente) => cliente.id === customerId || normalizePhone(cliente.phone) === phoneDigits
        );
        const localId = customerId || `cliente-${phoneDigits || Date.now()}`;
        const address =
          draft.tipo === 'delivery'
            ? {
                id: previous?.addresses?.[0]?.id || `end-${Date.now()}`,
                cep: draft.cep,
                street: draft.logradouro,
                number: draft.numero,
                district: draft.bairro,
                city: draft.cidade,
                state: draft.estado,
                complement: draft.complemento,
                principal: true,
              }
            : null;
        const nextCustomer = {
          ...(previous || {}),
          id: previous?.id || localId,
          name: draft.clienteNome,
          phone: phoneDigits,
          total_orders: Number(previous?.total_orders || 0) + 1,
          total_spent: Number(previous?.total_spent || 0) + totals.total,
          last_order_at: newOrder.createdAt,
          updated_at: newOrder.createdAt,
          created_at: previous?.created_at || newOrder.createdAt,
          addresses: address
            ? [address, ...(previous?.addresses || []).filter((item) => item.id !== address.id)]
            : previous?.addresses || [],
        };
        return {
          ...prev,
          clientes: [
            nextCustomer,
            ...(prev.clientes || []).filter((cliente) => cliente.id !== nextCustomer.id),
          ],
        };
      });
    } catch (error) {
      toast.error(error?.message || 'Erro ao criar pedido.');
      return;
    }

    setRecentIds((prev) => [...prev, newOrder.id]);
    setTimeout(() => setRecentIds((prev) => prev.filter((id) => id !== newOrder.id)), 2000);
    setCreateOpen(false);
    setModalInitialDraft(null);
    toast.success(`Pedido #${newOrder.id} criado com sucesso.`);
    if (printNow) printOrder(newOrder);
  }

  const detailOrder = allOrders.find((o) => o.id === detailOrderId);
  const paymentLabel = paymentLabelForOrder(detailOrder);

  return (
    <div className="admin-content admin-content-pedidos admin-orders-page">
      {!isMobile ? (
        <div className="admin-pedidos-caixa-zone">
          <CaixaPedidosChip />
        </div>
      ) : null}

      <div className="admin-pedidos-body">
      <div className="admin-pedidos-top">
        <div className="admin-pedidos-actions-row">
          <div className="admin-pedidos-search-row">
            <div className="admin-pedidos-search-wrap">
              <AdminIcon name="search" />
              <input
                className="admin-input admin-pedidos-search"
                placeholder="Pesquise pelo nome do cliente ou código do pedido"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="admin-tabs admin-tabs-pedidos admin-tabs-pedidos--desktop">
            {TYPE_FILTER_OPTIONS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`admin-tab ${typeFilter === t.key ? 'active' : ''}`}
                onClick={() => setTypeFilter(t.key)}
              >
                <span>{t.label}</span>
                <span className="admin-tab-count">{countsByType[t.key]}</span>
              </button>
            ))}
          </div>
          <div className="admin-pedidos-action-buttons">
            <div className="admin-pedidos-filter-wrap" ref={typeFilterRef}>
              <button
                type="button"
                className={`admin-pedidos-filter-btn${typeFilter !== 'todos' ? ' is-active' : ''}`}
                onClick={() => setTypeFilterOpen((open) => !open)}
                aria-label="Filtrar pedidos"
                aria-expanded={typeFilterOpen}
              >
                <i className="ph ph-sliders-horizontal" aria-hidden="true" />
              </button>
              {typeFilterOpen ? (
                <div className="admin-pedidos-filter-menu" role="menu">
                  {TYPE_FILTER_OPTIONS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      role="menuitem"
                      className={`admin-pedidos-filter-option${typeFilter === t.key ? ' is-active' : ''}`}
                      onClick={() => {
                        setTypeFilter(t.key);
                        setTypeFilterOpen(false);
                      }}
                    >
                      <span>{t.label}</span>
                      <span className="admin-tab-count">{countsByType[t.key]}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-pedidos-routes-btn"
              onClick={() => setRoutesOpen(true)}
            >
              <AdminKanbanStatusIcon status="delivery" />
              Rotas de entrega
            </button>
            <button type="button" className="admin-btn admin-btn-primary admin-pedidos-new-btn" onClick={() => openNewOrderModal(null)}>
              <AdminIcon name="plus" />
              Novo pedido
            </button>
            <button type="button" className="admin-text-btn admin-pedidos-view-archived" onClick={() => setArchiveOpen(true)}>
              Ver concluídos
            </button>
          </div>
        </div>
      </div>

      <div className={`admin-kanban-wrap admin-kanban-wrap-pedidos${caixaBlocked ? ' is-caixa-locked' : ''}`}>
        <div className="admin-kanban">
          {COLS.map((col) => {
            const colOrders = filteredOrders.filter((o) => o.status === col.key);
            return (
              <div key={col.key} className="admin-kanban-col">
                <div className="admin-kanban-col-header">
                  <div className="admin-kanban-title">
                    <span className={`admin-kanban-icon ${col.tone}`}>
                      <AdminKanbanStatusIcon status={col.key} />
                    </span>
                    <span>{col.label}</span>
                  </div>
                  <span className="admin-kanban-count">{colOrders.length}</span>
                </div>
                {colOrders.length === 0 ? (
                  <div className="admin-kanban-empty">
                    <span className="admin-kanban-empty-icon">
                      <AdminKanbanStatusIcon status={col.key} />
                    </span>
                    <strong>{col.emptyTitle}</strong>
                    <span>{col.emptyDescription}</span>
                  </div>
                ) : null}
                {colOrders.map((order) => {
                  const flash = recentIds.includes(order.id);
                  return (
                    <div
                      key={order.id}
                      className="admin-order-card"
                      style={flash ? { boxShadow: '0 0 0 2px #4e48dd inset' } : undefined}
                      onClick={() => setDetailOrderId(order.id)}
                    >
                      <h4 className="admin-order-card-title">
                        <span>{order.clienteNome}</span>
                        {order.clienteTelefone ? (
                          <span className="admin-order-card-phone">{fmtPhone(order.clienteTelefone)}</span>
                        ) : null}
                      </h4>
                      <div className="admin-order-meta">
                        #{order.id} · {TIPO_LABEL[order.tipo]}
                        {order.createdAt ? (
                          <span className="admin-order-age"> · {formatOrderAgePt(order.createdAt)}</span>
                        ) : null}
                        {order.aguardandoCaixa ? (
                          <span className="admin-order-caixa-badge">Aguardando caixa</span>
                        ) : null}
                      </div>
                      <div className="admin-order-meta">{deadlineLabel(order)}</div>
                      <div className="admin-order-card-footer">
                        <div className="admin-order-price">{currency(order.total)}</div>
                        <div className="admin-order-card-actions">
                          {buildOrderStatusNotifyUrl(order) ? (
                            <a
                              className="admin-btn admin-btn-whatsapp-sm admin-order-card-whatsapp"
                              href={buildOrderStatusNotifyUrl(order)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="Notificar cliente no WhatsApp"
                              aria-label="Notificar cliente no WhatsApp"
                            >
                              <span className="admin-order-card-whatsapp-label">WhatsApp</span>
                              <OrderCardWhatsAppIcon className="admin-order-card-whatsapp-icon" />
                            </a>
                          ) : null}
                          {order.status !== 'novo' ? (
                            <button
                              type="button"
                              className="admin-order-card-icon-btn admin-order-card-rollback"
                              onClick={(e) => {
                                e.stopPropagation();
                                rollbackStatus(order);
                              }}
                              title="Voltar status"
                              aria-label="Voltar status"
                            >
                              <i className="ph ph-arrow-circle-left" aria-hidden="true" />
                            </button>
                          ) : null}
                          {order.status !== 'concluido' ? (
                            <button
                              type="button"
                              className="admin-order-card-advance"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveStatus(order);
                              }}
                              title={orderAdvanceLabel(order)}
                            >
                              <i className={`admin-order-card-advance-icon ${orderAdvanceIconClass(order)}`} aria-hidden="true" />
                              <span className="admin-order-card-advance-label">{orderAdvanceLabel(order)}</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {caixaBlocked ? (
          <div className="admin-caixa-kanban-lock">
            <div className="admin-caixa-kanban-lock-panel">
              <p>
                {canReopen
                  ? 'O caixa foi fechado. Reabra para continuar operando pedidos.'
                  : 'Abra o caixa para operar pedidos.'}
              </p>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => openCaixaManage(canReopen ? 'reabrir' : 'abrir')}
              >
                {canReopen ? 'Reabrir caixa' : 'Abrir caixa'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      </div>

      <CaixaManageModal
        open={caixaManageModal}
        initialView={caixaManageView}
        onClose={() => setCaixaManageModal(false)}
        onSuccess={(error, message) => {
          if (error instanceof Error) toast.error(error.message);
          else if (message) {
            toast.success(message);
            void refreshOrders({ force: true, silent: true });
          }
        }}
      />

      <NewOrderModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setModalInitialDraft(null);
        }}
        onSave={saveOrder}
        products={products}
        categorias={categorias}
        initialDraft={modalInitialDraft}
      />

      <OrderDetailModal
        order={detailOrder}
        paymentLabel={paymentLabel}
        whatsAppNotifyUrl={
          detailOrder && !detailOrder.arquivado ? buildOrderStatusNotifyUrl(detailOrder) : null
        }
        whatsAppSummaryUrl={
          detailOrder && !detailOrder.arquivado ? buildOrderSummaryWhatsAppUrl(detailOrder) : null
        }
        readOnly={Boolean(detailOrder?.arquivado)}
        overlayClassName={archiveOpen ? 'admin-confirm-overlay-top' : ''}
        onClose={() => setDetailOrderId('')}
        canAdvance={detailOrder && detailOrder.status !== 'concluido' && detailOrder.status !== 'cancelado'}
        advanceLabel={
          detailOrder?.status === 'novo'
            ? 'Avançar para preparo'
            : detailOrder?.status === 'em_preparo'
              ? detailOrder?.tipo === 'delivery'
                ? 'Saiu para entrega'
                : 'Finalizar pedido'
              : 'Marcar como entregue'
        }
        onAdvance={() => {
          if (!detailOrder) return;
          moveStatus(detailOrder);
        }}
        onEdit={() => {
          if (!detailOrder) return;
          openNewOrderModal({
            ...EMPTY_ORDER_DRAFT,
            tipo: detailOrder.tipo,
            telefone: detailOrder.clienteTelefone || '',
            clienteNome: detailOrder.clienteNome || '',
            cep: detailOrder.endereco?.cep || '',
            logradouro: detailOrder.endereco?.logradouro || '',
            numero: detailOrder.endereco?.numero || '',
            bairro: detailOrder.endereco?.bairro || '',
            cidade: detailOrder.endereco?.cidade || '',
            complemento: detailOrder.endereco?.complemento || '',
            observacao: detailOrder.observacao || '',
            acrescimo: detailOrder.acrescimo ? String(detailOrder.acrescimo).replace('.', ',') : '',
            desconto: detailOrder.desconto ? String(detailOrder.desconto).replace('.', ',') : '',
            taxaEntrega: String(detailOrder.frete || 0).replace('.', ','),
            formaPagamento: detailOrder.pagamento?.metodo || 'dinheiro',
            cart: (detailOrder.itens || []).map((i) => ({
              id: uid(),
              produtoId: '',
              nome: i.nome,
              preco: Number(i.precoUnit || 0),
              qtd: Number(i.qtd || 1),
              obs: i.obs || '',
            })),
          });
          setDetailOrderId('');
        }}
        onPrint={() => detailOrder && printOrder(detailOrder)}
        onCancel={() => {
          if (!detailOrder) return;
          setCancelConfirmOpen(true);
        }}
      />

      <AdminConfirmDialog
        open={cancelConfirmOpen && Boolean(detailOrder)}
        title="Cancelar pedido"
        message="Tem certeza que deseja cancelar este pedido? Essa ação não pode ser desfeita pelo cliente."
        confirmLabel="Cancelar pedido"
        cancelLabel="Voltar"
        danger
        onCancel={() => setCancelConfirmOpen(false)}
        onConfirm={() => {
          if (!detailOrder) return;
          setCancelConfirmOpen(false);
          void cancelOrder(detailOrder).then(() => setDetailOrderId(''));
        }}
      />

      {archiveOpen ? (
        <div className="admin-confirm-overlay" onClick={() => setArchiveOpen(false)}>
          <div className="admin-order-detail-modal admin-archive-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-order-detail-head">
              <div>
                <span className="admin-order-detail-kicker">Pedidos concluídos</span>
                <h2>{concludedOrders.length} pedido(s)</h2>
              </div>
              <button type="button" className="admin-order-detail-close" onClick={() => setArchiveOpen(false)} aria-label="Fechar">
                ×
              </button>
            </div>
            <div className="admin-archive-filters">
              <div className="admin-form-group">
                <label className="admin-label">De</label>
                <input
                  type="date"
                  className="admin-input"
                  value={archiveDateFrom}
                  onChange={(e) => setArchiveDateFrom(e.target.value)}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Até</label>
                <input
                  type="date"
                  className="admin-input"
                  value={archiveDateTo}
                  onChange={(e) => setArchiveDateTo(e.target.value)}
                />
              </div>
            </div>
            <div className="admin-archive-list">
              {concludedOrders.length === 0 ? (
                <p className="admin-order-meta">Nenhum pedido concluído no período.</p>
              ) : (
                concludedOrders.map((order) => (
                  <div key={order.id} className="admin-archive-row">
                    <div>
                      <strong>#{order.id} · {order.clienteNome}</strong>
                      <div className="admin-order-meta">
                        {currency(order.total)} · {new Date(order.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <div className="admin-archive-row-actions">
                      <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setDetailOrderId(order.id)}>
                        Ver
                      </button>
                      <button type="button" className="admin-btn admin-btn-primary" onClick={() => handleRestoreArchived(order.id)}>
                        Restaurar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      <DeliveryRoutesModal
        open={routesOpen}
        onClose={() => setRoutesOpen(false)}
        onRoutesChanged={() => void refreshOrders({ force: true, silent: true })}
      />
    </div>
  );
}
