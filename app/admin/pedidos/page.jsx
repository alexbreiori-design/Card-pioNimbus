'use client';

import { useMemo, useState } from 'react';
import NewOrderModal from '@/components/admin/orders/NewOrderModal';
import OrderDetailModal from '@/components/admin/orders/OrderDetailModal';
import AdminIcon from '@/components/admin/AdminIcon';
import {
  computeOrderTotals,
  currency,
  EMPTY_ORDER_DRAFT,
  fmtPhone,
} from '@/components/admin/orders/orderDraftUtils';
import { useAdminData } from '@/hooks/useAdminData';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { ensureCustomer, normalizePhone, updateCustomerStats, upsertClienteEndereco } from '@/lib/supabase/customers';
import { resolveEmpresaIdFromStore } from '@/lib/supabase/empresa';

const COLS = [
  {
    key: 'novo',
    label: 'Novos',
    icon: 'orders',
    tone: 'blue',
    emptyTitle: 'Nenhum pedido novo',
    emptyDescription: 'Pedidos novos aparecerão aqui',
  },
  {
    key: 'em_preparo',
    label: 'Em preparo',
    icon: 'prep',
    tone: 'amber',
    emptyTitle: 'Nenhum pedido em preparo',
    emptyDescription: 'Pedidos em preparo aparecerão aqui',
  },
  {
    key: 'saiu_entrega',
    label: 'Saiu para entrega',
    icon: 'delivery',
    tone: 'green',
    emptyTitle: 'Nenhum pedido para entrega',
    emptyDescription: 'Pedidos para entrega aparecerão aqui',
  },
  {
    key: 'concluido',
    label: 'Concluídos',
    icon: 'done',
    tone: 'brand',
    emptyTitle: 'Nenhum pedido concluído',
    emptyDescription: 'Pedidos concluídos aparecerão aqui',
  },
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
  concluido: 'saiu_entrega',
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

function estimateMinutes(loja) {
  const value = Math.max(1, Number(loja?.tempoEntregaValor || 45));
  return loja?.tempoEntregaUnidade === 'horas' ? value * 60 : value;
}

function etaFromNow(loja) {
  return new Date(Date.now() + estimateMinutes(loja) * 60000);
}

export default function PedidosPage() {
  const { data, saveData } = useAdminData();
  const storeSlug = data.loja?.slug || '';
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [toast, setToast] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [modalInitialDraft, setModalInitialDraft] = useState(null);
  const [detailOrderId, setDetailOrderId] = useState('');
  const [recentIds, setRecentIds] = useState([]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveDateFrom, setArchiveDateFrom] = useState('');
  const [archiveDateTo, setArchiveDateTo] = useState('');

  const products = useMemo(() => (data.produtos || []).filter((p) => p.ativo !== false), [data.produtos]);
  const categorias = useMemo(() => (data.categorias || []).filter((c) => c.ativo !== false), [data.categorias]);
  const orders = useMemo(() => (data.pedidos || []).filter((o) => !o.arquivado), [data.pedidos]);

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

  function pushToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  }

  function openNewOrderModal(initialDraft = null) {
    setModalInitialDraft(initialDraft);
    setCreateOpen(true);
  }

  function moveStatus(order) {
    const next = STATUS_NEXT[order.status];
    if (!next) return;
    saveData((prev) => ({
      ...prev,
      pedidos: prev.pedidos.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: next,
              historico: [...(o.historico || []), { status: next, at: new Date().toISOString() }],
            }
          : o
      ),
    }));
    pushToast(`Pedido #${order.id} movido para ${STATUS_LABEL[next]}.`);
  }

  function rollbackStatus(order) {
    const prevStatus = STATUS_PREV[order.status];
    if (!prevStatus) return;
    saveData((prev) => ({
      ...prev,
      pedidos: prev.pedidos.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: prevStatus,
              historico: [...(o.historico || []), { status: prevStatus, at: new Date().toISOString() }],
            }
          : o
      ),
    }));
    pushToast(`Pedido #${order.id} voltou para ${STATUS_LABEL[prevStatus]}.`);
  }

  function archiveConcluded() {
    saveData((prev) => ({
      ...prev,
      pedidos: prev.pedidos.map((o) => (o.status === 'concluido' ? { ...o, arquivado: true } : o)),
    }));
    pushToast('Pedidos concluídos movidos para arquivo.');
  }

  function restoreArchived(orderId) {
    saveData((prev) => ({
      ...prev,
      pedidos: prev.pedidos.map((o) => (o.id === orderId ? { ...o, arquivado: false } : o)),
    }));
    pushToast(`Pedido #${orderId} restaurado.`);
  }

  const archivedOrders = useMemo(() => {
    return (data.pedidos || [])
      .filter((o) => o.arquivado)
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
  }, [data.pedidos, archiveDateFrom, archiveDateTo]);

  async function saveOrder(draft, printNow = false) {
    const totals = computeOrderTotals(draft);
    const eta = etaFromNow(data.loja);
    const newOrder = {
      id: uid(),
      status: 'novo',
      tipo: draft.tipo,
      clienteNome: draft.clienteNome,
      clienteTelefone: fmtPhone(draft.telefone),
      createdAt: new Date().toISOString(),
      prazo: eta.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      entregarAte: eta.toISOString(),
      endereco:
        draft.tipo === 'delivery'
          ? {
              cep: draft.cep,
              logradouro: draft.logradouro,
              numero: draft.numero,
              bairro: draft.bairro,
              cidade: draft.cidade,
              estado: draft.estado,
              complemento: draft.complemento,
            }
          : null,
      enderecoTexto:
        draft.tipo === 'delivery'
          ? `${draft.logradouro || ''}${draft.numero ? `, ${draft.numero}` : ''} - ${draft.bairro || ''} - ${draft.cidade || ''}`
          : 'Retirada no estabelecimento',
      observacao: draft.observacao,
      itens: draft.cart.map((i) => ({
        nome: i.nome,
        qtd: i.qtd,
        precoUnit: i.preco,
        subtotal: i.qtd * i.preco,
        obs: i.obs || '',
      })),
      subtotal: totals.subtotal,
      frete: totals.entrega,
      acrescimo: totals.acrescimo,
      desconto: totals.desconto,
      cupomCodigo: draft.cupomCodigo || '',
      total: totals.total,
      historico: [{ status: 'novo', at: new Date().toISOString() }],
      pagamento: { metodo: draft.formaPagamento, recebido: totals.total, troco: 0 },
      autoImported: false,
    };

    let customerId = null;
    try {
      const empresaId = await resolveEmpresaIdFromStore(storeSlug);
      const customer = await ensureCustomer({
        name: draft.clienteNome,
        phone: draft.telefone,
        empresaId,
      });
      customerId = customer?.id || null;
      if (empresaId) {
        const supabase = createSupabaseClient();
        await supabase.from('pedidos').insert({
          empresa_id: empresaId,
          cliente_id: customerId,
          codigo: String(newOrder.id),
          status: 'novo',
          tipo: newOrder.tipo,
          origem: 'admin_manual',
          cliente_nome: newOrder.clienteNome,
          cliente_telefone: normalizePhone(newOrder.clienteTelefone),
          endereco_texto:
            newOrder.tipo === 'delivery'
              ? `${newOrder.endereco?.logradouro || ''}, ${newOrder.endereco?.numero || ''} - ${newOrder.endereco?.bairro || ''} - ${newOrder.endereco?.cidade || ''}`
              : newOrder.tipo === 'retirada'
                ? 'Retirada no balcão'
                : 'Balcão',
          subtotal: newOrder.subtotal,
          taxa_entrega: newOrder.frete,
          acrescimo: newOrder.acrescimo,
          desconto: newOrder.desconto,
          total: newOrder.total,
          forma_pagamento_codigo: draft.formaPagamento,
          cupom_codigo: draft.cupomCodigo || null,
          observacao: newOrder.observacao || null,
        });
        await updateCustomerStats({ customerId, orderValue: newOrder.total, empresaId });
        if (newOrder.tipo === 'delivery' && newOrder.endereco) {
          await upsertClienteEndereco({
            clienteId: customerId,
            empresaId,
            patch: {
              cep: newOrder.endereco.cep,
              street: newOrder.endereco.logradouro,
              number: newOrder.endereco.numero,
              district: newOrder.endereco.bairro,
              city: newOrder.endereco.cidade,
              state: newOrder.endereco.estado,
              complement: newOrder.endereco.complemento,
              principal: true,
            },
          });
        }
      }
    } catch {}

    saveData((prev) => {
      const phone = normalizePhone(newOrder.clienteTelefone);
      const localId = customerId || `cliente-${phone || Date.now()}`;
      const previous = (prev.clientes || []).find((cliente) => cliente.id === localId || normalizePhone(cliente.phone) === phone);
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
        phone,
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
        pedidos: [{ ...newOrder, customer_id: nextCustomer.id }, ...(prev.pedidos || [])],
      };
    });
    setRecentIds((prev) => [...prev, newOrder.id]);
    setTimeout(() => setRecentIds((prev) => prev.filter((id) => id !== newOrder.id)), 2000);
    setCreateOpen(false);
    setModalInitialDraft(null);
    pushToast(`Pedido #${newOrder.id} criado com sucesso.`);
    if (printNow) window.print();
  }

  const detailOrder = (data.pedidos || []).find((o) => o.id === detailOrderId);
  const paymentLabel =
    PAYMENT_LABEL[detailOrder?.pagamento?.metodo] || detailOrder?.pagamento?.metodo || '—';

  return (
    <div className="admin-content admin-content-pedidos admin-orders-page">
      {toast ? <div className="admin-store-message">{toast}</div> : null}
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

      <div className="admin-pedidos-actions-row">
        <div className="admin-tabs admin-tabs-pedidos">
          {['todos', 'delivery', 'retirada', 'balcao'].map((t) => (
            <button key={t} type="button" className={`admin-tab ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>
              <span>{t === 'todos' ? 'Todos' : TIPO_LABEL[t]}</span>
              <span className="admin-tab-count">{countsByType[t]}</span>
            </button>
          ))}
        </div>
        <div className="admin-pedidos-action-buttons">
          <button type="button" className="admin-btn admin-btn-primary admin-pedidos-new-btn" onClick={() => openNewOrderModal(null)}>
            <AdminIcon name="plus" />
            Novo pedido
          </button>
          <button type="button" className="admin-btn admin-btn-ghost admin-pedidos-archive-btn" onClick={archiveConcluded}>
            <AdminIcon name="archive" />
            Arquivar Concluídos
          </button>
          <button type="button" className="admin-text-btn admin-pedidos-view-archived" onClick={() => setArchiveOpen(true)}>
            Ver arquivados
          </button>
        </div>
      </div>

      <div className="admin-kanban-wrap admin-kanban-wrap-pedidos">
        <div className="admin-kanban">
          {COLS.map((col) => {
            const colOrders = filteredOrders.filter((o) => o.status === col.key);
            return (
              <div key={col.key} className="admin-kanban-col">
                <div className="admin-kanban-col-header">
                  <div className="admin-kanban-title">
                    <span className={`admin-kanban-icon ${col.tone}`}>
                      <AdminIcon name={col.icon} />
                    </span>
                    <span>{col.label}</span>
                  </div>
                  <span className="admin-kanban-count">{colOrders.length}</span>
                </div>
                {colOrders.length === 0 ? (
                  <div className="admin-kanban-empty">
                    <span className="admin-kanban-empty-icon">
                      <AdminIcon name={col.icon} />
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
                      <h4>{order.clienteNome}</h4>
                      <div className="admin-order-meta">
                        #{order.id} · {TIPO_LABEL[order.tipo]}
                      </div>
                      <div className="admin-order-meta">
                        {order.tipo === 'delivery'
                          ? `${order.endereco?.logradouro || ''}, ${order.endereco?.numero || ''} - ${order.endereco?.bairro || ''} - ${order.endereco?.cidade || ''}`
                          : order.tipo === 'retirada'
                            ? 'Retirada no balcão'
                            : 'Balcão'}
                      </div>
                      <div className="admin-order-meta">{deadlineLabel(order)}</div>
                      <div className="admin-order-card-actions">
                        <div className="admin-order-price">{currency(order.total)}</div>
                        {order.status !== 'novo' ? (
                          <button
                            type="button"
                            className="admin-btn admin-btn-ghost"
                            style={{ padding: '4px 8px', fontSize: 12 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              rollbackStatus(order);
                            }}
                            title="Voltar status"
                          >
                            ←
                          </button>
                        ) : null}
                        {order.status !== 'concluido' ? (
                          <button
                            type="button"
                            className="admin-btn admin-btn-ghost"
                            style={{ padding: '6px 8px', fontSize: 12 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveStatus(order);
                            }}
                          >
                            {order.status === 'novo'
                              ? 'Avançar para preparo'
                              : order.status === 'em_preparo'
                                ? order.tipo === 'delivery'
                                  ? 'Saiu para entrega'
                                  : 'Finalizar'
                                : 'Marcar como entregue'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

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
        onPrint={() => window.print()}
        onCancel={() => {
          if (!detailOrder || !window.confirm('Cancelar pedido?')) return;
          saveData((prev) => ({
            ...prev,
            pedidos: prev.pedidos.map((p) => (p.id === detailOrder.id ? { ...p, status: 'cancelado' } : p)),
          }));
          setDetailOrderId('');
        }}
      />

      {archiveOpen ? (
        <div className="admin-confirm-overlay" onClick={() => setArchiveOpen(false)}>
          <div className="admin-order-detail-modal admin-archive-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-order-detail-head">
              <div>
                <span className="admin-order-detail-kicker">Pedidos arquivados</span>
                <h2>{archivedOrders.length} pedido(s)</h2>
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
              {archivedOrders.length === 0 ? (
                <p className="admin-order-meta">Nenhum pedido arquivado no período.</p>
              ) : (
                archivedOrders.map((order) => (
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
                      <button type="button" className="admin-btn admin-btn-primary" onClick={() => restoreArchived(order.id)}>
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
    </div>
  );
}
