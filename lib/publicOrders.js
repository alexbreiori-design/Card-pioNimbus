import { normalizePhone } from '@/lib/supabase/customers';

export const ORDERS_STORAGE_PREFIX = 'cardapio_orders_v1';

const PAY_LABELS = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  credito: 'Cartão de crédito',
  debito: 'Cartão de débito',
  vale: 'Vale refeição',
};

function normalizeSlug(slug) {
  return String(slug || '').trim().toLowerCase().replace(/\s+/g, '-');
}

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

export function mergePublicOrders({ jsonPedidos = [], apiOrders = [], cachedOrders = [], phoneDigits = '' }) {
  const byId = new Map();

  const add = (order) => {
    if (!order?.id) return;
    if (phoneDigits && normalizePhone(order.clienteTelefone) !== phoneDigits) return;

    const key = String(order.id);
    const existing = byId.get(key);
    const orderTime = new Date(order.createdAt || 0).getTime();
    const existingTime = existing ? new Date(existing.createdAt || 0).getTime() : 0;

    if (!existing) {
      byId.set(key, order);
      return;
    }

    // Prefer newer status from remote sources when ids match.
    const statusPriority = { novo: 1, em_preparo: 2, saiu_entrega: 3, concluido: 4, cancelado: 4 };
    const nextRank = statusPriority[order.status] || 0;
    const prevRank = statusPriority[existing.status] || 0;

    if (nextRank >= prevRank || orderTime >= existingTime) {
      byId.set(key, { ...existing, ...order, itens: order.itens?.length ? order.itens : existing.itens });
    }
  };

  [...cachedOrders, ...jsonPedidos.map(mapJsonPedidoToPublic), ...apiOrders.map(mapApiPedidoToPublic)].forEach(add);

  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

export async function fetchPublicOrdersRemote(slug, phone) {
  const safeSlug = normalizeSlug(slug);
  const phoneDigits = normalizePhone(phone);
  if (!safeSlug || !phoneDigits) return [];

  try {
    const params = new URLSearchParams({ slug: safeSlug, phone: phoneDigits });
    const res = await fetch(`/api/public-orders?${params.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok || !json.ok) return [];
    return Array.isArray(json.orders) ? json.orders : [];
  } catch {
    return [];
  }
}
