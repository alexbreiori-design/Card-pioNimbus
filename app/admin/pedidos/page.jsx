'use client';

import { useMemo, useState } from 'react';
import NewOrderModal from '@/components/admin/orders/NewOrderModal';
import {
  computeOrderTotals,
  currency,
  EMPTY_ORDER_DRAFT,
  fmtPhone,
} from '@/components/admin/orders/orderDraftUtils';
import { useAdminData } from '@/hooks/useAdminData';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { ensureCustomer, normalizePhone, updateCustomerStats } from '@/lib/supabase/customers';
import { resolveEmpresaIdFromStore } from '@/lib/supabase/empresa';

const COLS = [
  { key: 'novo', label: 'Novos', color: '#F59E0B' },
  { key: 'em_preparo', label: 'Em preparo', color: '#3B82F6' },
  { key: 'saiu_entrega', label: 'Saiu para entrega', color: '#10B981' },
  { key: 'concluido', label: 'Concluídos', color: '#6B7280' },
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

export default function PedidosPage() {
  const { data, saveData } = useAdminData();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [toast, setToast] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [modalInitialDraft, setModalInitialDraft] = useState(null);
  const [detailOrderId, setDetailOrderId] = useState('');
  const [recentIds, setRecentIds] = useState([]);

  const products = useMemo(() => (data.produtos || []).filter((p) => p.ativo !== false), [data.produtos]);
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

  const maxColumnItems = useMemo(
    () => Math.max(...COLS.map((col) => filteredOrders.filter((o) => o.status === col.key).length), 1),
    [filteredOrders]
  );
  const kanbanMinHeight = 160 + maxColumnItems * 160;

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

  async function saveOrder(draft, printNow = false) {
    const totals = computeOrderTotals(draft);
    const newOrder = {
      id: uid(),
      status: 'novo',
      tipo: draft.tipo,
      clienteNome: draft.clienteNome,
      clienteTelefone: fmtPhone(draft.telefone),
      createdAt: new Date().toISOString(),
      prazo: '--:--',
      endereco:
        draft.tipo === 'delivery'
          ? {
              cep: draft.cep,
              logradouro: draft.logradouro,
              numero: draft.numero,
              bairro: draft.bairro,
              cidade: draft.cidade,
              complemento: draft.complemento,
            }
          : null,
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
      const empresaId = await resolveEmpresaIdFromStore();
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
      }
    } catch {}

    saveData((prev) => ({ ...prev, pedidos: [{ ...newOrder, customer_id: customerId }, ...(prev.pedidos || [])] }));
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
    <div className="admin-content admin-content-pedidos">
      {toast ? <div className="admin-store-message">{toast}</div> : null}
      <div className="admin-pedidos-search-row">
        <input
          className="admin-input admin-pedidos-search"
          placeholder="Pesquisa pelo nome do cliente ou código do pedido"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="admin-pedidos-actions-row">
        <div className="admin-tabs admin-tabs-pedidos">
          {['todos', 'delivery', 'retirada', 'balcao'].map((t) => (
            <button key={t} type="button" className={`admin-tab ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>
              {t === 'todos' ? 'Todos' : TIPO_LABEL[t]} {countsByType[t]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={archiveConcluded}>
            Arquivar Concluídos
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => openNewOrderModal(null)}>
            + Novo pedido
          </button>
        </div>
      </div>

      <div className="admin-kanban-wrap admin-kanban-wrap-pedidos">
        <div className="admin-kanban">
          {COLS.map((col) => {
            const colOrders = filteredOrders.filter((o) => o.status === col.key);
            return (
              <div key={col.key} className="admin-kanban-col" style={{ minHeight: kanbanMinHeight }}>
                <div className="admin-kanban-col-header" style={{ borderTop: `4px solid ${col.color}` }}>
                  <span>{col.label}</span>
                  <span className="admin-kanban-count">{colOrders.length}</span>
                </div>
                {colOrders.map((order) => {
                  const flash = recentIds.includes(order.id);
                  return (
                    <div
                      key={order.id}
                      className="admin-order-card"
                      style={flash ? { boxShadow: '0 0 0 2px #f59e0b inset' } : undefined}
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, alignItems: 'center', gap: 6 }}>
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
        initialDraft={modalInitialDraft}
      />

      {detailOrder ? (
        <div className="admin-confirm-overlay" onClick={() => setDetailOrderId('')}>
          <div className="admin-confirm-modal" style={{ width: 'min(900px, 96vw)', maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 6 }}>{detailOrder.clienteNome}</h3>
            <p style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>{detailOrder.clienteTelefone}</p>
            <p style={{ marginTop: 0 }}>Pedido #{detailOrder.id}</p>
            <p>
              {detailOrder.tipo === 'delivery'
                ? `${detailOrder.endereco?.logradouro || ''}, ${detailOrder.endereco?.numero || ''} - ${detailOrder.endereco?.bairro || ''} - ${detailOrder.endereco?.cidade || ''}`
                : detailOrder.tipo === 'retirada'
                  ? 'Retirada no balcão'
                  : 'Balcão'}
            </p>
            <p>{deadlineLabel(detailOrder)}</p>
            <div className="admin-card" style={{ marginBottom: 12 }}>
              {(detailOrder.historico || []).map((h, idx) => (
                <div key={`${h.status}-${idx}`} className="admin-order-meta" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: '#94a3b8', display: 'inline-block' }} />
                  {STATUS_LABEL[h.status]} ({new Date(h.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                </div>
              ))}
            </div>
            <div className="admin-card" style={{ marginBottom: 12 }}>
              <h4 style={{ marginTop: 0 }}>Itens do pedido</h4>
              {(detailOrder.itens || []).map((i, idx) => (
                <div key={`${i.nome}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                  <div>
                    <strong style={{ fontSize: 16 }}>
                      {i.qtd}x {i.nome}
                    </strong>
                    {i.obs ? <div className="admin-order-meta">{i.obs}</div> : null}
                  </div>
                  <strong style={{ fontSize: 18 }}>{currency(i.subtotal)}</strong>
                </div>
              ))}
            </div>
            <div className="admin-card" style={{ marginTop: 12 }}>
              {detailOrder.subtotal > 0 ? <div className="admin-order-meta">Subtotal: {currency(detailOrder.subtotal)}</div> : null}
              {detailOrder.frete > 0 ? <div className="admin-order-meta">Entrega: {currency(detailOrder.frete)}</div> : null}
              {detailOrder.acrescimo > 0 ? <div className="admin-order-meta">Acréscimo: {currency(detailOrder.acrescimo)}</div> : null}
              {detailOrder.desconto > 0 ? <div className="admin-order-meta">Desconto: -{currency(detailOrder.desconto)}</div> : null}
              <div className="admin-order-price">Total: {currency(detailOrder.total)}</div>
              <div className="admin-order-meta" style={{ marginTop: 8 }}>
                Forma de pagamento: {paymentLabel}
              </div>
            </div>
            <div className="admin-confirm-actions">
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => {
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
              >
                Editar pedido
              </button>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => window.print()}>
                Imprimir pedido
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={() => {
                  if (!window.confirm('Cancelar pedido?')) return;
                  saveData((prev) => ({
                    ...prev,
                    pedidos: prev.pedidos.map((p) => (p.id === detailOrder.id ? { ...p, status: 'cancelado' } : p)),
                  }));
                  setDetailOrderId('');
                }}
              >
                Cancelar pedido
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={() => setDetailOrderId('')}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
