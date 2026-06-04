import { normalizePhone, normalizeSlug } from '@/lib/normalize';

const ORDERS_STORAGE_PREFIX = 'cardapio_public_orders';
const HIDDEN_HISTORY_PREFIX = 'cardapio_hidden_history';

export function getHiddenHistoryKey(slug) {
  return `${HIDDEN_HISTORY_PREFIX}_${normalizeSlug(slug) || 'default'}`;
}

export function readHiddenHistoryOrderIds(slug) {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(getHiddenHistoryKey(slug));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    const ids = Array.isArray(parsed?.ids) ? parsed.ids : [];
    return new Set(ids.map(String));
  } catch {
    return new Set();
  }
}

export function addHiddenHistoryOrderIds(slug, orderIds) {
  if (typeof window === 'undefined' || !orderIds?.length) return;
  const hidden = readHiddenHistoryOrderIds(slug);
  orderIds.forEach((id) => hidden.add(String(id)));
  try {
    window.localStorage.setItem(
      getHiddenHistoryKey(slug),
      JSON.stringify({ ids: [...hidden], clearedAt: new Date().toISOString() })
    );
  } catch {
    /* quota / private mode */
  }
}

/** Oculta do cardápio pedidos finalizados que o cliente escolheu limpar do histórico. */
export function filterOrdersForClientView(orders, slug) {
  const hidden = readHiddenHistoryOrderIds(slug);
  if (!hidden.size) return orders || [];
  return (orders || []).filter((order) => {
    if (!['concluido', 'cancelado'].includes(order.status)) return true;
    return !hidden.has(String(order.id));
  });
}

const PAY_LABELS = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  credito: 'Cartão de crédito',
  debito: 'Cartão de débito',
  vale: 'Vale refeição',
};

export function getOrdersStorageKey(slug) {
  return `${ORDERS_STORAGE_PREFIX}_${normalizeSlug(slug) || 'default'}`;
}

export function readCachedOrders(slug) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getOrdersStorageKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.orders) ? parsed.orders : [];
  } catch {
    return [];
  }
}

export function writeCachedOrders(slug, orders) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      getOrdersStorageKey(slug),
      JSON.stringify({
        slug: normalizeSlug(slug),
        updatedAt: new Date().toISOString(),
        orders,
      })
    );
  } catch {
    /* quota / private mode */
  }
}

/** Remove pedidos finalizados/cancelados do cache local do cliente. */
export function clearClientOrderHistory(orders) {
  return (orders || []).filter((o) => !['concluido', 'cancelado'].includes(o.status));
}

export function mapJsonPedidoToPublic(pedido) {
  return {
    id: pedido.id,
    status: pedido.status,
    tipo: pedido.tipo,
    createdAt: pedido.createdAt,
    prazo: pedido.prazo,
    entregarAte: pedido.entregarAte,
    clienteNome: pedido.clienteNome,
    clienteTelefone: pedido.clienteTelefone,
    enderecoTexto: pedido.enderecoTexto,
    pagamento: PAY_LABELS[pedido.pagamento?.metodo] || pedido.pagamento?.metodo || pedido.pagamento || '',
    itens: pedido.itens || [],
    subtotal: pedido.subtotal,
    frete: pedido.frete,
    desconto: pedido.desconto,
    cupomCodigo: pedido.cupomCodigo,
    total: pedido.total,
  };
}

export function mapApiPedidoToPublic(row) {
  return {
    id: row.codigo || row.id,
    status: row.status,
    tipo: row.tipo,
    createdAt: row.created_at,
    prazo: row.entregar_ate
      ? new Date(row.entregar_ate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '',
    entregarAte: row.entregar_ate,
    clienteNome: row.cliente_nome,
    clienteTelefone: row.cliente_telefone,
    enderecoTexto: row.endereco_texto,
    pagamento: PAY_LABELS[row.forma_pagamento_codigo] || row.forma_pagamento_codigo || '',
    itens: (row.itens || []).map((item) => ({
      nome: item.nome,
      qtd: item.quantidade,
      precoUnit: item.preco_unitario,
      subtotal: item.preco_total,
      obs: item.observacao || '',
      produtoId: item.produto_id,
    })),
    subtotal: row.subtotal,
    frete: row.taxa_entrega,
    desconto: row.desconto,
    cupomCodigo: row.cupom_codigo,
    total: row.total,
  };
}

function isPlaceholderPhone(value) {
  const digits = normalizePhone(value);
  return !digits || digits.length < 10 || /^0+$/.test(digits);
}

/** Telefone do cliente para buscar pedidos (perfil, checkout ou cache). */
export function resolveOrderPhoneDigits({ profileDisplayPhone, profilePhone, checkoutPhone, cachedOrders = [] }) {
  const candidates = [
    profilePhone,
    profileDisplayPhone,
    checkoutPhone,
    ...(cachedOrders || []).map((order) => order.clienteTelefone),
  ];

  for (const candidate of candidates) {
    if (isPlaceholderPhone(candidate)) continue;
    const digits = normalizePhone(candidate);
    if (digits.length >= 10) return digits;
  }
  return '';
}

export function mergePublicOrders({ jsonPedidos = [], apiOrders = [], cachedOrders = [], phoneDigits = '' }) {
  const byId = new Map();

  const matchesPhone = (order) => {
    if (!phoneDigits) return true;
    return normalizePhone(order?.clienteTelefone) === phoneDigits;
  };

  const upsert = (order, { authoritative = false } = {}) => {
    if (!order?.id || !matchesPhone(order)) return;
    const key = String(order.id);
    const existing = byId.get(key);
    if (!existing) {
      byId.set(key, order);
      return;
    }
    if (authoritative) {
      byId.set(key, {
        ...existing,
        ...order,
        itens: order.itens?.length ? order.itens : existing.itens,
      });
      return;
    }
    byId.set(key, {
      ...order,
      ...existing,
      status: existing.status,
      itens: existing.itens?.length ? existing.itens : order.itens,
    });
  };

  cachedOrders.forEach((order) => upsert(order));
  jsonPedidos.map(mapJsonPedidoToPublic).forEach((order) => upsert(order));
  apiOrders.map(mapApiPedidoToPublic).forEach((order) => upsert(order, { authoritative: true }));

  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

export async function fetchPublicOrdersRemote(slug, phone) {
  const safeSlug = normalizeSlug(slug);
  const phoneDigits = normalizePhone(phone);
  if (!safeSlug || !phoneDigits) return { orders: [], latestUpdatedAt: null };

  try {
    const params = new URLSearchParams({ slug: safeSlug, phone: phoneDigits });
    const res = await fetch(`/api/public-orders?${params.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok || !json.ok) return { orders: [], latestUpdatedAt: null };
    return {
      orders: Array.isArray(json.orders) ? json.orders : [],
      latestUpdatedAt: json.latestUpdatedAt ?? null,
    };
  } catch {
    return { orders: [], latestUpdatedAt: null };
  }
}
