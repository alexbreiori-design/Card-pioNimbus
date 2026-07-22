import { DEFAULT_STORE_TIMEZONE } from '@/lib/storeHours';
import {
  buildLastOrderMap,
  resolveStoreActivityStatus,
} from '@/lib/superAdmin/storeActivity';
import { zonedDayStartMs } from '@/lib/admin/reports/reportPeriod';

const MS_DAY = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * MS_DAY;
const SEVEN_DAYS_MS = 7 * MS_DAY;

function zonedDateKey(ms, timeZone = DEFAULT_STORE_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

function emptyChannel() {
  return { pedidos: 0, faturamento: 0 };
}

function emptyPeriodMetrics() {
  return {
    pedidos: 0,
    faturamento: 0,
    ticketMedio: 0,
    itens: 0,
    online: emptyChannel(),
    balcao: emptyChannel(),
    delivery: 0,
    retirada: 0,
    balcaoTipo: 0,
    concluidos: 0,
    emAndamento: 0,
    cancelados: 0,
  };
}

export function emptyMetrics() {
  return {
    pedidos30d: 0,
    faturamento30d: 0,
    pedidosTotal: 0,
    faturamentoTotal: 0,
    hoje: emptyPeriodMetrics(),
    d7: emptyPeriodMetrics(),
    d30: emptyPeriodMetrics(),
    total: emptyPeriodMetrics(),
  };
}

function finalizePeriod(period) {
  period.ticketMedio = period.pedidos > 0 ? period.faturamento / period.pedidos : 0;
  return period;
}

function isOnlineOrigem(origem) {
  return String(origem || '') === 'cardapio_online';
}

function orderDateTs(row) {
  const preferred = row.status_concluido_em || row.created_at;
  const ts = preferred ? new Date(preferred).getTime() : 0;
  return Number.isFinite(ts) ? ts : 0;
}

function addToPeriod(period, row, itemQty) {
  const total = Number(row.total) || 0;
  const status = String(row.status || '');
  const tipo = String(row.tipo || '');
  const canceled = status === 'cancelado';

  if (canceled) {
    period.cancelados += 1;
    return;
  }

  period.pedidos += 1;
  period.faturamento += total;
  period.itens += itemQty;

  if (status === 'concluido') period.concluidos += 1;
  else period.emAndamento += 1;

  if (isOnlineOrigem(row.origem)) {
    period.online.pedidos += 1;
    period.online.faturamento += total;
  } else {
    period.balcao.pedidos += 1;
    period.balcao.faturamento += total;
  }

  if (tipo === 'delivery') period.delivery += 1;
  else if (tipo === 'retirada') period.retirada += 1;
  else if (tipo === 'balcao') period.balcaoTipo += 1;
}

async function fetchPedidosForMetrics(supabase, empresaIds, { onlineOnly = false } = {}) {
  if (!empresaIds.length) return [];
  let query = supabase
    .from('pedidos')
    .select('id, empresa_id, total, status, origem, tipo, created_at, status_concluido_em')
    .in('empresa_id', empresaIds);
  if (onlineOnly) {
    query = query.eq('origem', 'cardapio_online').neq('status', 'cancelado');
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function fetchItemQtyByPedido(supabase, pedidoIds) {
  const qtyByPedido = new Map();
  if (!pedidoIds.length) return qtyByPedido;

  const chunkSize = 500;
  for (let offset = 0; offset < pedidoIds.length; offset += chunkSize) {
    const chunk = pedidoIds.slice(offset, offset + chunkSize);
    const { data, error } = await supabase
      .from('pedido_itens')
      .select('pedido_id, quantidade')
      .in('pedido_id', chunk);
    if (error) throw error;
    (data || []).forEach((row) => {
      const current = qtyByPedido.get(row.pedido_id) || 0;
      qtyByPedido.set(row.pedido_id, current + Number(row.quantidade || 0));
    });
  }

  return qtyByPedido;
}

async function fetchLogosBySlug(supabase, slugs) {
  if (!slugs.length) return new Map();
  const { data, error } = await supabase
    .from('menu_store_state')
    .select('slug, store_config')
    .in('slug', slugs);
  if (error) throw error;
  const map = new Map();
  (data || []).forEach((row) => {
    const logo = row?.store_config?.loja?.logoUrl || '';
    if (logo) map.set(row.slug, logo);
  });
  return map;
}

function computeMetricsFromPedidos(pedidos, empresaId, itemQtyByPedido = new Map(), now = Date.now()) {
  const metrics = emptyMetrics();
  const todayStart = zonedDayStartMs(new Date(now));
  const since7 = now - SEVEN_DAYS_MS;
  const since30 = now - THIRTY_DAYS_MS;

  (pedidos || [])
    .filter((row) => row.empresa_id === empresaId)
    .forEach((row) => {
      const ts = orderDateTs(row);
      if (!ts) return;
      const itemQty = Number(itemQtyByPedido.get(row.id) || 0);

      addToPeriod(metrics.total, row, itemQty);
      if (ts >= since30) addToPeriod(metrics.d30, row, itemQty);
      if (ts >= since7) addToPeriod(metrics.d7, row, itemQty);
      if (ts >= todayStart) addToPeriod(metrics.hoje, row, itemQty);
    });

  finalizePeriod(metrics.hoje);
  finalizePeriod(metrics.d7);
  finalizePeriod(metrics.d30);
  finalizePeriod(metrics.total);

  // Compatível com telas antigas (somente online, 30d / total).
  metrics.pedidos30d = metrics.d30.online.pedidos;
  metrics.faturamento30d = metrics.d30.online.faturamento;
  metrics.pedidosTotal = metrics.total.online.pedidos;
  metrics.faturamentoTotal = metrics.total.online.faturamento;

  return metrics;
}

/** Série diária no fuso da loja (últimos N dias). */
export function computeDailySeriesZoned(pedidos, days = 30, now = Date.now()) {
  const safeDays = Math.max(7, Math.min(90, Number(days) || 30));
  const todayStart = zonedDayStartMs(new Date(now));
  const buckets = new Map();

  for (let index = safeDays - 1; index >= 0; index -= 1) {
    const dayStart = zonedDayStartMs(new Date(todayStart - index * MS_DAY + 12 * 60 * 60 * 1000));
    const key = zonedDateKey(dayStart);
    buckets.set(key, {
      date: key,
      pedidos: 0,
      faturamento: 0,
      online: 0,
      balcao: 0,
    });
  }

  const firstKey = buckets.keys().next().value;
  const firstStart = firstKey
    ? zonedDayStartMs(new Date(`${firstKey}T12:00:00`))
    : todayStart - (safeDays - 1) * MS_DAY;

  (pedidos || []).forEach((row) => {
    if (String(row.status || '') === 'cancelado') return;
    const ts = orderDateTs(row);
    if (!ts || ts < firstStart) return;
    const key = zonedDateKey(ts);
    const bucket = buckets.get(key);
    if (!bucket) return;
    bucket.pedidos += 1;
    bucket.faturamento += Number(row.total) || 0;
    if (isOnlineOrigem(row.origem)) bucket.online += 1;
    else bucket.balcao += 1;
  });

  return Array.from(buckets.values());
}

/** Lista pública-segura: logo + status de atividade (sem métricas financeiras). */
export async function enrichStoresForList(supabase, stores) {
  if (!stores?.length) return [];

  const empresaIds = stores.map((row) => row.id);
  const slugs = stores.map((row) => row.slug);
  const [logoBySlug, pedidos] = await Promise.all([
    fetchLogosBySlug(supabase, slugs),
    fetchPedidosForMetrics(supabase, empresaIds, { onlineOnly: true }),
  ]);
  const lastOrderMap = buildLastOrderMap(pedidos);

  return stores.map((store) => ({
    id: store.id,
    slug: store.slug,
    nome: store.nome,
    endereco_cidade: store.endereco_cidade,
    segmento: store.segmento,
    aberta: store.aberta,
    memberCount: store.memberCount,
    created_at: store.created_at,
    logoUrl: logoBySlug.get(store.slug) || store.logo_url || null,
    activityStatus: resolveStoreActivityStatus({
      createdAt: store.created_at,
      lastPedidoAt: lastOrderMap.get(store.id) || null,
    }),
  }));
}

/** Métricas completas para detalhe da loja. */
export async function getStoreMetrics(supabase, empresaId) {
  const pedidos = await fetchPedidosForMetrics(supabase, [empresaId], { onlineOnly: false });
  const itemQtyByPedido = await fetchItemQtyByPedido(
    supabase,
    pedidos.map((row) => row.id).filter(Boolean)
  );
  const nonCanceled = pedidos.filter((row) => row.status !== 'cancelado');
  const lastPedidoAt = buildLastOrderMap(nonCanceled).get(empresaId) || null;

  return {
    metrics: computeMetricsFromPedidos(pedidos, empresaId, itemQtyByPedido),
    pedidos,
    lastPedidoAt,
    activityStatus: resolveStoreActivityStatus({
      createdAt: null,
      lastPedidoAt,
    }),
  };
}

export function countActivityStatuses(stores) {
  return (stores || []).reduce(
    (acc, store) => {
      acc.total += 1;
      if (store.aberta) acc.abertas += 1;
      if (store.activityStatus === 'sem_pedido_recente') acc.semPedidoRecente += 1;
      if (store.activityStatus === 'nova') acc.novas += 1;
      return acc;
    },
    { total: 0, abertas: 0, semPedidoRecente: 0, novas: 0 }
  );
}
