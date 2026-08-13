'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCep } from '@/lib/cep/viacep';
import { useCepLookup } from '@/hooks/useCepLookup';
import { useEmpresa } from '@/hooks/useEmpresa';
import AdminDiscardDialog from '@/components/admin/AdminDiscardDialog';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminIcon from '@/components/admin/AdminIcon';
import OrderDetailModal from '@/components/admin/orders/OrderDetailModal';
import ClienteContaPanel from '@/components/admin/clientes/ClienteContaPanel';
import {
  buildOrderDraftFromCustomer,
  stashPendingNewOrderDraft,
} from '@/components/admin/orders/orderDraftUtils';
import { formatSaldoDevedor } from '@/lib/fiado/clienteConta';
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import { isJsonDirty } from '@/lib/admin/isFormDirty';
import { useAdminData } from '@/hooks/useAdminData';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import { useOrderPrint } from '@/context/OrderPrintContext';
import {
  createCustomer,
  deleteCliente,
  deleteClienteEndereco,
  listClienteEnderecos,
  listPedidosByCliente,
  updateCliente,
  upsertClienteEndereco,
} from '@/lib/supabase/customers';
import {
  formatMobilePhoneBr,
  isCompleteMobilePhoneBr,
  mobilePhoneIncompleteMessage,
} from '@/lib/phoneBr';

function money(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}

function fmtPhone(v) {
  return formatMobilePhoneBr(v);
}

function fmtDateBr(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}

const INACTIVE_DAYS = 60;

function getCustomerStatus(customer) {
  const orders = Number(customer?.total_orders || 0);
  const lastAt = customer?.last_order_at ? new Date(customer.last_order_at).getTime() : 0;
  const cutoff = Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000;

  if (!lastAt || lastAt < cutoff) {
    return { key: 'inativo', label: 'Inativo' };
  }
  if (orders >= 3) {
    return { key: 'recorrente', label: 'Recorrente' };
  }
  if (orders <= 1) {
    return { key: 'novo', label: 'Novo' };
  }
  return { key: 'ativo', label: 'Ativo' };
}

function customerWhatsAppUrl(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

const STATUS_FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'com_saldo', label: 'Com pendência' },
  { key: 'inativo', label: 'Inativos' },
  { key: 'recorrente', label: 'Recorrentes' },
  { key: 'novo', label: 'Novos' },
];

const CLIENTES_PAGE_SIZE = 25;

function mapLocalPedido(pedido) {
  return {
    id: pedido.id,
    rawId: String(pedido.id),
    total: Number(pedido.total || 0),
    status: pedido.status,
    statusLabel: pedido.status,
    created_at: pedido.createdAt,
  };
}

function dedupeOrders(orders) {
  const seen = new Set();
  return orders.filter((order) => {
    const key = String(order.rawId || order.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeAddresses(addresses) {
  const seen = new Set();
  return addresses.filter((address) => {
    const key = String(address.id || `${address.street}-${address.number}-${address.cep}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function orderItemsSummary(pedido) {
  const itens = pedido?.itens || [];
  if (!itens.length) return 'Sem itens';
  const preview = itens
    .slice(0, 2)
    .map((item) => `${item.qtd}x ${item.nome}`)
    .join(', ');
  return itens.length > 2 ? `${preview} +${itens.length - 2}` : preview;
}

function findAdminOrderForHistory(summary, adminOrders = []) {
  if (!summary) return null;
  const rawId = String(summary.rawId || '');
  const codigo = String(summary.id || '');
  return (
    adminOrders.find(
      (pedido) =>
        (rawId && String(pedido.dbId || '') === rawId) ||
        (codigo && String(pedido.id || '') === codigo) ||
        (rawId && String(pedido.id || '') === rawId)
    ) || null
  );
}

function localOrdersForCustomer(customer, adminPedidos = []) {
  const phoneKey = fmtPhone(customer.phone);
  return (adminPedidos || [])
    .filter(
      (pedido) =>
        pedido.customer_id === customer.id || fmtPhone(pedido.clienteTelefone) === phoneKey
    )
    .map(mapLocalPedido);
}

const EMPTY_NEW = {
  name: '',
  phone: '',
  cep: '',
  street: '',
  number: '',
  district: '',
  city: '',
  state: '',
};

function CepSearchButton({ onLookup, cep, disabled }) {
  return (
    <button
      type="button"
      className="admin-btn admin-btn-ghost"
      style={{ padding: '8px 10px' }}
      title="Buscar CEP"
      disabled={disabled}
      onClick={() => onLookup(cep)}
      aria-label="Buscar CEP"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
      </svg>
    </button>
  );
}

function CustomerRowActions({ customer, waUrl, onOpen, onNewOrder, onDelete }) {
  return (
    <div className="admin-clientes-row-actions">
      <button
        type="button"
        className="admin-btn admin-btn-ghost admin-btn-sm admin-clientes-action-icon admin-clientes-action-open"
        onClick={() => onOpen(customer)}
        title="Abrir cliente"
        aria-label="Abrir cliente"
      >
        <i className="hgi-stroke hgi-pencil-edit-02" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="admin-btn admin-btn-ghost admin-btn-sm admin-clientes-action-icon admin-clientes-action-order"
        onClick={() => onNewOrder(customer)}
        title="Novo pedido"
        aria-label="Novo pedido"
      >
        <i className="hgi-stroke hgi-note-add" aria-hidden="true" />
      </button>
      {waUrl ? (
        <a
          className="admin-btn admin-btn-whatsapp-sm admin-clientes-action-icon admin-clientes-action-whatsapp"
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="WhatsApp"
          aria-label="Abrir WhatsApp"
        >
          <ion-icon name="logo-whatsapp" aria-hidden="true" />
        </a>
      ) : (
        <button
          type="button"
          className="admin-btn admin-btn-whatsapp-sm admin-clientes-action-icon admin-clientes-action-whatsapp"
          disabled
          title="WhatsApp indisponível"
          aria-label="WhatsApp indisponível"
        >
          <ion-icon name="logo-whatsapp" aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        className="admin-btn admin-btn-ghost admin-btn-sm admin-clientes-action-icon admin-clientes-action-danger"
        onClick={() => onDelete(customer.id)}
        title="Excluir cliente"
        aria-label="Excluir cliente"
      >
        <i className="hgi-stroke hgi-delete-02" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function ClientesPage() {
  const router = useRouter();
  const { empresaId, loading: empresaLoading, error: empresaError } = useEmpresa();
  const { data: adminData, saveData, activeSlug, ready: adminReady } = useAdminData();
  const { orders: adminOrders } = useAdminOrders();
  const { printOrder } = useOrderPrint();
  const { lookup: lookupCep, loading: cepLoading, error: cepError, clearError: clearCepError } = useCepLookup();
  const storeSlug = String(activeSlug || adminData?.loja?.slug || '').trim().toLowerCase();

  const [customers, setCustomers] = useState([]);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [listPage, setListPage] = useState(0);
  const [ordersByCustomer, setOrdersByCustomer] = useState({});
  const [addressesByCustomer, setAddressesByCustomer] = useState({});
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState('dados');
  const [newDraft, setNewDraft] = useState(EMPTY_NEW);
  const [detailBaseline, setDetailBaseline] = useState(null);
  const [addressesBaseline, setAddressesBaseline] = useState('');
  const toast = useAdminToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selectedOrderId, setSelectedOrderId] = useState('');

  function startNewOrderForCustomer(customer) {
    const draft = buildOrderDraftFromCustomer(customer, addressesByCustomer[customer.id] || []);
    stashPendingNewOrderDraft(draft);
    router.push('/admin/pedidos');
  }

  const isNewDirty = useMemo(
    () => newOpen && isJsonDirty(newDraft, EMPTY_NEW),
    [newOpen, newDraft]
  );

  const isDetailDirty = useMemo(() => {
    if (!detail || !detailBaseline) return false;
    if ((detail.name || '') !== detailBaseline.name) return true;
    if ((detail.phone || '') !== detailBaseline.phone) return true;
    return JSON.stringify(addressesByCustomer[detail.id] || []) !== addressesBaseline;
  }, [detail, detailBaseline, addressesBaseline, addressesByCustomer]);

  function closeNewModal() {
    setNewOpen(false);
    setNewDraft(EMPTY_NEW);
  }

  async function openCustomerDetail(customer) {
    setDetail({ ...customer });
    setDetailBaseline({ name: customer.name || '', phone: customer.phone || '' });
    setTab('dados');

    if (!empresaId) {
      setAddressesBaseline(JSON.stringify(addressesByCustomer[customer.id] || []));
      return;
    }

    try {
      const [addresses, pedidos] = await Promise.all([
        listClienteEnderecos(customer.id, empresaId),
        listPedidosByCliente(customer.id, empresaId),
      ]);
      const local = dedupeOrders(localOrdersForCustomer(customer, adminData.pedidos || []));
      const mergedOrders = dedupeOrders([...(pedidos || []), ...local]).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setAddressesByCustomer((prev) => ({ ...prev, [customer.id]: addresses || [] }));
      setOrdersByCustomer((prev) => ({ ...prev, [customer.id]: mergedOrders }));
      setAddressesBaseline(JSON.stringify(addresses || []));
    } catch (e) {
      setAddressesBaseline(JSON.stringify(addressesByCustomer[customer.id] || []));
      toast.error(e?.message || 'Erro ao carregar detalhes do cliente.');
    }
  }

  function closeCustomerDetail() {
    setDetail(null);
    setDetailBaseline(null);
    setAddressesBaseline('');
  }

  const {
    overlayPointerDown: newOverlayPointerDown,
    overlayClick: newOverlayClick,
    requestClose: requestCloseNew,
    discardOpen: newDiscardOpen,
    confirmDiscard: confirmDiscardNew,
    cancelDiscard: cancelDiscardNew,
  } = useAdminOverlayClose({
    onClose: closeNewModal,
    isDirty: isNewDirty,
  });

  const {
    overlayPointerDown: detailOverlayPointerDown,
    overlayClick: detailOverlayClick,
    requestClose: requestCloseDetail,
    discardOpen: detailDiscardOpen,
    confirmDiscard: confirmDiscardDetail,
    cancelDiscard: cancelDiscardDetail,
  } = useAdminOverlayClose({
    onClose: closeCustomerDetail,
    isDirty: isDetailDirty,
  });

  useEffect(() => {
    if (cepError) toast.error(cepError);
  }, [cepError, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput);
      setListPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const totalPages = Math.max(1, Math.ceil(customersTotal / CLIENTES_PAGE_SIZE));
  const pageStart = customersTotal === 0 ? 0 : listPage * CLIENTES_PAGE_SIZE + 1;
  const pageEnd = Math.min(customersTotal, (listPage + 1) * CLIENTES_PAGE_SIZE);

  const selectedOrder = useMemo(
    () => adminOrders.find((p) => String(p.id) === String(selectedOrderId)),
    [adminOrders, selectedOrderId]
  );

  const loadPage = useCallback(async () => {
    if (!adminReady || !storeSlug) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        slug: storeSlug,
        page: String(listPage),
        pageSize: String(CLIENTES_PAGE_SIZE),
        status: statusFilter,
      });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const response = await fetch(`/api/admin/clientes?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `Erro ao carregar clientes (${response.status}).`);
      }

      setCustomers(payload.clientes || []);
      setCustomersTotal(Number(payload.total) || 0);
      const maxPage = Math.max(0, Math.ceil((Number(payload.total) || 0) / CLIENTES_PAGE_SIZE) - 1);
      if (listPage > maxPage) setListPage(maxPage);
    } catch (e) {
      toast.error(e?.message || 'Erro ao carregar clientes.');
      setCustomers([]);
      setCustomersTotal(0);
    } finally {
      setLoading(false);
    }
  }, [adminReady, listPage, searchQuery, statusFilter, storeSlug, toast]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  function changeStatusFilter(next) {
    setStatusFilter(next);
    setListPage(0);
  }

  async function handleNewCepLookup() {
    clearCepError();
    const result = await lookupCep(newDraft.cep);
    if (!result) return;
    setNewDraft((d) => ({
      ...d,
      street: result.logradouro || d.street,
      district: result.bairro || d.district,
      city: result.cidade || d.city,
      state: result.estado || d.state,
    }));
  }

  async function saveNew() {
    if (!newDraft.name.trim() || !newDraft.phone.trim()) {
      toast.error('Nome e telefone são obrigatórios.');
      return;
    }
    if (!isCompleteMobilePhoneBr(newDraft.phone)) {
      toast.error(mobilePhoneIncompleteMessage());
      return;
    }
    try {
      await createCustomer({
        name: newDraft.name,
        phone: newDraft.phone,
        empresaId,
        address: {
          cep: newDraft.cep,
          street: newDraft.street,
          number: newDraft.number,
          district: newDraft.district,
          city: newDraft.city,
          state: newDraft.state,
        },
      });
      toast.success('Cliente criado com sucesso.');
      closeNewModal();
      void loadPage();
    } catch (e) {
      toast.error(`Erro ao criar cliente: ${e.message}`);
    }
  }

  async function saveDetail() {
    if (!detail || !empresaId) return;
    if (!isCompleteMobilePhoneBr(detail.phone)) {
      toast.error(mobilePhoneIncompleteMessage());
      return;
    }
    try {
      await updateCliente({
        id: detail.id,
        name: detail.name,
        phone: detail.phone,
        empresaId,
      });
      const savedName = detail.name || '';
      const savedPhone = detail.phone || '';
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === detail.id ? { ...c, name: savedName, phone: savedPhone } : c
        )
      );
      toast.success('Cliente atualizado.');
      closeCustomerDetail();
      void loadPage();
    } catch (e) {
      toast.error(`Erro ao salvar: ${e.message}`);
    }
  }

  async function handleDeleteCustomer(id) {
    if (!window.confirm('Excluir cliente?')) return;
    const target = customers.find((c) => c.id === id) || (detail?.id === id ? detail : null);
    const phoneKey = fmtPhone(target?.phone);
    try {
      await deleteCliente(id, empresaId);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setOrdersByCustomer((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setAddressesByCustomer((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (detail?.id === id) closeCustomerDetail();

      try {
        await saveData((prev) => ({
          ...prev,
          clientes: (prev.clientes || []).filter((c) => {
            if (c.id === id) return false;
            if (phoneKey && fmtPhone(c.phone) === phoneKey) return false;
            return true;
          }),
        }));
      } catch (storeError) {
        console.warn('Falha ao limpar cliente do estado da loja:', storeError?.message || storeError);
      }

      toast.success('Cliente excluído.');
      void loadPage();
    } catch (e) {
      toast.error(`Erro ao excluir: ${e.message}`);
    }
  }

  async function addAddress() {
    if (!detail || !empresaId) return;
    try {
      await upsertClienteEndereco({
        clienteId: detail.id,
        empresaId,
        patch: {
          cep: '',
          street: '',
          number: '',
          district: '',
          city: '',
          state: '',
          principal: !(addressesByCustomer[detail.id] || []).length,
        },
      });
      const enderecos = await listClienteEnderecos(detail.id, empresaId);
      setAddressesByCustomer((prev) => ({ ...prev, [detail.id]: enderecos }));
      setAddressesBaseline(JSON.stringify(enderecos));
      toast.success('Endereço adicionado. Preencha os campos e salve.');
    } catch (e) {
      toast.error(`Erro ao adicionar endereço: ${e.message}`);
    }
  }

  function patchAddressLocal(clienteId, addressId, field, value) {
    setAddressesByCustomer((prev) => ({
      ...prev,
      [clienteId]: (prev[clienteId] || []).map((a) => (a.id === addressId ? { ...a, [field]: value } : a)),
    }));
  }

  async function saveAddress(clienteId, address) {
    if (!empresaId) return;
    try {
      await upsertClienteEndereco({
        id: address.id,
        clienteId,
        empresaId,
        patch: address,
      });
      toast.success('Endereço salvo.');
      const enderecos = await listClienteEnderecos(clienteId, empresaId);
      setAddressesByCustomer((prev) => ({ ...prev, [clienteId]: enderecos }));
      if (detail?.id === clienteId) {
        setAddressesBaseline(JSON.stringify(enderecos));
      }
    } catch (e) {
      toast.error(`Erro ao salvar endereço: ${e.message}`);
    }
  }

  async function handleAddressCepLookup(clienteId, address) {
    clearCepError();
    const result = await lookupCep(address.cep);
    if (!result) return;
    const patched = {
      ...address,
      street: result.logradouro || address.street,
      district: result.bairro || address.district,
      city: result.cidade || address.city,
      state: result.estado || address.state,
    };
    setAddressesByCustomer((prev) => ({
      ...prev,
      [clienteId]: (prev[clienteId] || []).map((a) => (a.id === address.id ? patched : a)),
    }));
  }

  async function removeAddress(clienteId, addressId) {
    if (!window.confirm('Remover este endereço?')) return;
    try {
      await deleteClienteEndereco(addressId, empresaId);
      const nextAddresses = (addressesByCustomer[clienteId] || []).filter((a) => a.id !== addressId);
      setAddressesByCustomer((prev) => ({
        ...prev,
        [clienteId]: nextAddresses,
      }));
      if (detail?.id === clienteId) {
        setAddressesBaseline(JSON.stringify(nextAddresses));
      }
      toast.success('Endereço removido.');
    } catch (e) {
      toast.error(`Erro ao remover endereço: ${e.message}`);
    }
  }

  if (empresaLoading) {
    return (
      <div className="admin-content admin-content-pedidos">
        <div className="admin-order-meta">Carregando empresa...</div>
      </div>
    );
  }

  if ((empresaError || !empresaId) && !(adminData.clientes || []).length) {
    return (
      <div className="admin-content admin-content-pedidos">
        <div className="admin-store-message">{empresaError || 'Empresa não encontrada.'}</div>
      </div>
    );
  }

  return (
    <div className="admin-content admin-content-pedidos admin-catalog-page admin-section-page admin-clientes-page admin-compact-card-page">
      <AdminPageHeader title="Clientes" icon="customers" />

      <div className="admin-clientes-toolbar">
        <div className="admin-clientes-toolbar-main">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => {
              setNewDraft(EMPTY_NEW);
              setNewOpen(true);
            }}
          >
            + Novo cliente
          </button>
          <div className="admin-pedidos-search-wrap">
            <AdminIcon name="search" />
            <input
              className="admin-input admin-pedidos-search"
              placeholder="Buscar por nome ou telefone"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
        <div className="admin-clientes-status-filters" role="tablist" aria-label="Filtrar por status">
          {STATUS_FILTERS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="tab"
              aria-selected={statusFilter === opt.key}
              className={`admin-clientes-filter-chip${statusFilter === opt.key ? ' is-active' : ''}`}
              onClick={() => changeStatusFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card admin-clientes-list-card">
        {loading ? (
          <div className="admin-order-meta">Carregando clientes...</div>
        ) : customers.length === 0 ? (
          <div className="admin-order-meta">Nenhum cliente encontrado.</div>
        ) : (
          <>
            <div className="admin-clientes-table-wrap">
              <table className="admin-clientes-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Telefone</th>
                    <th>Pedidos</th>
                    <th>Total gasto</th>
                    <th>Saldo</th>
                    <th>Último pedido</th>
                    <th>Status</th>
                    <th className="admin-clientes-table-actions-col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => {
                    const status = getCustomerStatus(c);
                    const waUrl = customerWhatsAppUrl(c.phone);
                    return (
                      <tr key={c.id}>
                        <td>
                          <span className="admin-clientes-table-name">{c.name || '—'}</span>
                        </td>
                        <td>{fmtPhone(c.phone) || '—'}</td>
                        <td>{c.total_orders || 0}</td>
                        <td>{money(c.total_spent)}</td>
                        <td>
                          {Number(c.saldo_fiado) > 0 ? (
                            <span className="admin-clientes-saldo-value is-debt">
                              {formatSaldoDevedor(c.saldo_fiado)}
                            </span>
                          ) : (
                            <span className="admin-order-meta">—</span>
                          )}
                        </td>
                        <td>{fmtDateBr(c.last_order_at)}</td>
                        <td>
                          <span className={`admin-clientes-status-chip is-${status.key}`}>
                            {status.label}
                          </span>
                        </td>
                        <td>
                          <CustomerRowActions
                            customer={c}
                            waUrl={waUrl}
                            onOpen={openCustomerDetail}
                            onNewOrder={startNewOrderForCustomer}
                            onDelete={handleDeleteCustomer}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="admin-clientes-mobile-list">
              {customers.map((c) => {
                const status = getCustomerStatus(c);
                const waUrl = customerWhatsAppUrl(c.phone);
                return (
                  <li key={c.id} className="admin-clientes-mobile-item">
                    <div className="admin-clientes-mobile-top">
                      <span className="admin-clientes-table-name">{c.name || '—'}</span>
                      <span className={`admin-clientes-status-chip is-${status.key}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="admin-clientes-mobile-meta">
                      <span>{fmtPhone(c.phone) || '—'}</span>
                      <span>
                        {c.total_orders || 0} pedidos · {money(c.total_spent)}
                      </span>
                      {Number(c.saldo_fiado) > 0 ? (
                        <span className="admin-clientes-saldo-value is-debt">
                          {formatSaldoDevedor(c.saldo_fiado)}
                        </span>
                      ) : null}
                      <span>Último: {fmtDateBr(c.last_order_at)}</span>
                    </div>
                    <CustomerRowActions
                      customer={c}
                      waUrl={waUrl}
                      onOpen={openCustomerDetail}
                      onNewOrder={startNewOrderForCustomer}
                      onDelete={handleDeleteCustomer}
                    />
                  </li>
                );
              })}
            </ul>

            <div className="admin-clientes-pagination">
              <p className="admin-clientes-pagination-meta">
                {pageStart}–{pageEnd} de {customersTotal} cliente{customersTotal === 1 ? '' : 's'}
              </p>
              <div className="admin-clientes-pagination-controls">
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  disabled={listPage <= 0 || loading}
                  onClick={() => setListPage(0)}
                >
                  Primeira
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  disabled={listPage <= 0 || loading}
                  onClick={() => setListPage((p) => Math.max(0, p - 1))}
                >
                  Anterior
                </button>
                <span className="admin-clientes-pagination-page">
                  Página {listPage + 1} de {totalPages}
                </span>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  disabled={listPage >= totalPages - 1 || loading}
                  onClick={() => setListPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  Próxima
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  disabled={listPage >= totalPages - 1 || loading}
                  onClick={() => setListPage(totalPages - 1)}
                >
                  Última
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {newOpen ? (
        <>
        <div
          className="admin-confirm-overlay"
          role="presentation"
          onPointerDown={newOverlayPointerDown}
          onClick={newOverlayClick}
        >
          <div className="admin-confirm-modal" style={{ width: 'min(560px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
            <h3>Novo cliente</h3>
            <div className="admin-form-group">
              <label className="admin-label">Nome *</label>
              <input
                className="admin-input"
                value={newDraft.name}
                onChange={(e) => setNewDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Nome completo do cliente"
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Telefone *</label>
              <input
                className="admin-input"
                value={newDraft.phone}
                onChange={(e) => setNewDraft((d) => ({ ...d, phone: fmtPhone(e.target.value) }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <p className="admin-help-text" style={{ marginTop: 16 }}>
              Endereço (opcional)
            </p>
            <div className="admin-form-group">
              <label className="admin-label">CEP</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <input
                  className="admin-input"
                  value={newDraft.cep}
                  onChange={(e) => setNewDraft((d) => ({ ...d, cep: formatCep(e.target.value) }))}
                  placeholder="00000-000"
                />
                <CepSearchButton onLookup={handleNewCepLookup} cep={newDraft.cep} disabled={cepLoading} />
              </div>
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Endereço</label>
              <input
                className="admin-input"
                value={newDraft.street}
                onChange={(e) => setNewDraft((d) => ({ ...d, street: e.target.value }))}
                placeholder="Rua, avenida ou travessa"
              />
            </div>
            <div className="admin-store-form-grid" style={{ padding: 0, gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className="admin-form-group">
                <label className="admin-label">Número</label>
                <input
                  className="admin-input"
                  value={newDraft.number}
                  onChange={(e) => setNewDraft((d) => ({ ...d, number: e.target.value }))}
                  placeholder="Número"
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Bairro</label>
                <input
                  className="admin-input"
                  value={newDraft.district}
                  onChange={(e) => setNewDraft((d) => ({ ...d, district: e.target.value }))}
                  placeholder="Bairro"
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Cidade</label>
                <input
                  className="admin-input"
                  value={newDraft.city}
                  onChange={(e) => setNewDraft((d) => ({ ...d, city: e.target.value }))}
                  placeholder="Cidade"
                />
              </div>
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Estado</label>
              <input
                className="admin-input"
                value={newDraft.state}
                onChange={(e) => setNewDraft((d) => ({ ...d, state: e.target.value }))}
                maxLength={2}
                placeholder="SP"
              />
            </div>
            <div className="admin-confirm-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={requestCloseNew}>
                Cancelar
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={saveNew}>
                Salvar
              </button>
            </div>
          </div>
        </div>
        <AdminDiscardDialog
          open={newDiscardOpen}
          onConfirm={confirmDiscardNew}
          onCancel={cancelDiscardNew}
        />
        </>
      ) : null}

      {detail ? (
        <>
        <div
          className="admin-confirm-overlay"
          role="presentation"
          onPointerDown={detailOverlayPointerDown}
          onClick={detailOverlayClick}
        >
          <div
            className="admin-confirm-modal"
            style={{ width: 'min(900px, 96vw)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{detail.name}</h3>
            <div className="admin-tabs admin-tabs-pedidos">
              <button type="button" className={`admin-tab ${tab === 'dados' ? 'active' : ''}`} onClick={() => setTab('dados')}>
                Dados
              </button>
              <button type="button" className={`admin-tab ${tab === 'enderecos' ? 'active' : ''}`} onClick={() => setTab('enderecos')}>
                Endereços
              </button>
              <button type="button" className={`admin-tab ${tab === 'historico' ? 'active' : ''}`} onClick={() => setTab('historico')}>
                Histórico
              </button>
              <button type="button" className={`admin-tab ${tab === 'conta' ? 'active' : ''}`} onClick={() => setTab('conta')}>
                Conta
              </button>
            </div>

            {tab === 'dados' ? (
              <>
                <div className="admin-form-group">
                  <label className="admin-label">Nome</label>
                  <input
                    className="admin-input"
                    value={detail.name || ''}
                    onChange={(e) => setDetail((d) => ({ ...d, name: e.target.value }))}
                    placeholder="Nome completo do cliente"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Telefone</label>
                  <input
                    className="admin-input"
                    value={detail.phone || ''}
                    onChange={(e) => setDetail((d) => ({ ...d, phone: fmtPhone(e.target.value) }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="admin-confirm-actions">
                  <button type="button" className="admin-btn admin-btn-primary" onClick={saveDetail}>
                    Salvar
                  </button>
                </div>
              </>
            ) : null}

            {tab === 'enderecos' ? (
              <>
                <button type="button" className="admin-btn admin-btn-ghost" onClick={addAddress}>
                  + Adicionar endereço
                </button>
                <div style={{ marginTop: 10, display: 'grid', gap: 12 }}>
                  {(addressesByCustomer[detail.id] || []).length === 0 ? (
                    <p className="admin-order-meta">Nenhum endereço cadastrado.</p>
                  ) : null}
                  {(addressesByCustomer[detail.id] || []).map((a) => (
                    <div key={a.id} className="admin-card">
                      <div className="admin-form-group">
                        <label className="admin-label">CEP</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                          <input
                            className="admin-input"
                            value={a.cep}
                            onChange={(e) => patchAddressLocal(detail.id, a.id, 'cep', formatCep(e.target.value))}
                            placeholder="00000-000"
                          />
                          <CepSearchButton
                            onLookup={() => handleAddressCepLookup(detail.id, a)}
                            cep={a.cep}
                            disabled={cepLoading}
                          />
                        </div>
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Endereço</label>
                        <input
                          className="admin-input"
                          value={a.street}
                          onChange={(e) => patchAddressLocal(detail.id, a.id, 'street', e.target.value)}
                          placeholder="Rua, avenida ou travessa"
                        />
                      </div>
                      <div className="admin-store-form-grid" style={{ padding: 0, gridTemplateColumns: '1fr 1fr 1fr' }}>
                        <div className="admin-form-group">
                          <label className="admin-label">Número</label>
                          <input
                            className="admin-input"
                            value={a.number}
                            onChange={(e) => patchAddressLocal(detail.id, a.id, 'number', e.target.value)}
                            placeholder="Número"
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-label">Bairro</label>
                          <input
                            className="admin-input"
                            value={a.district}
                            onChange={(e) => patchAddressLocal(detail.id, a.id, 'district', e.target.value)}
                            placeholder="Bairro"
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-label">Cidade</label>
                          <input
                            className="admin-input"
                            value={a.city}
                            onChange={(e) => patchAddressLocal(detail.id, a.id, 'city', e.target.value)}
                            placeholder="Cidade"
                          />
                        </div>
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Estado</label>
                        <input
                          className="admin-input"
                          value={a.state}
                          maxLength={2}
                          onChange={(e) => patchAddressLocal(detail.id, a.id, 'state', e.target.value.toUpperCase())}
                          placeholder="UF"
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button type="button" className="admin-btn admin-btn-primary" onClick={() => saveAddress(detail.id, a)}>
                          Salvar endereço
                        </button>
                        <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeAddress(detail.id, a.id)}>
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {tab === 'historico' ? (
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {(ordersByCustomer[detail.id] || []).length === 0 ? (
                  <p className="admin-order-meta">Nenhum pedido encontrado para este cliente.</p>
                ) : null}
                {(ordersByCustomer[detail.id] || []).map((o) => {
                  const fullOrder = findAdminOrderForHistory(o, adminOrders);
                  return (
                  <button
                    key={o.rawId || o.id}
                    type="button"
                    className="admin-card admin-client-order-history-btn"
                    onClick={() => {
                      if (fullOrder) setSelectedOrderId(fullOrder.id);
                    }}
                    disabled={!fullOrder}
                    title={fullOrder ? 'Ver detalhes do pedido' : 'Pedido indisponível no painel'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>Pedido #{o.id}</strong>
                      <strong>{money(o.total)}</strong>
                    </div>
                    <div className="admin-order-meta">
                      {o.statusLabel} · {new Date(o.created_at).toLocaleString('pt-BR')}
                    </div>
                    {fullOrder ? (
                      <div className="admin-order-meta">{orderItemsSummary(fullOrder)}</div>
                    ) : null}
                  </button>
                  );
                })}
              </div>
            ) : null}

            {tab === 'conta' ? (
              <ClienteContaPanel
                customer={detail}
                empresaId={empresaId}
                onSaldoChange={(novoSaldo) => {
                  setDetail((d) => (d ? { ...d, saldo_fiado: novoSaldo } : d));
                  setCustomers((prev) =>
                    prev.map((c) => (c.id === detail.id ? { ...c, saldo_fiado: novoSaldo } : c))
                  );
                }}
              />
            ) : null}

            <div className="admin-confirm-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={requestCloseDetail}>
                Fechar
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => startNewOrderForCustomer(detail)}
              >
                Novo pedido
              </button>
            </div>
          </div>
        </div>
        <AdminDiscardDialog
          open={detailDiscardOpen}
          onConfirm={confirmDiscardDetail}
          onCancel={cancelDiscardDetail}
        />
        </>
      ) : null}

      <OrderDetailModal
        order={selectedOrder}
        readOnly
        onClose={() => setSelectedOrderId('')}
        onEdit={() => {}}
        onPrint={() => selectedOrder && printOrder(selectedOrder)}
        onCancel={() => {}}
        onAdvance={() => {}}
        canAdvance={false}
      />
    </div>
  );
}
