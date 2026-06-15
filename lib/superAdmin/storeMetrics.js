import {
  buildLastOrderMap,
  resolveStoreActivityStatus,
} from '@/lib/superAdmin/storeActivity';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function emptyMetrics() {
  return {
    pedidos30d: 0,
    faturamento30d: 0,
    pedidosTotal: 0,
    faturamentoTotal: 0,
  };
}

async function fetchPedidosOnline(supabase, empresaIds) {
  if (!empresaIds.length) return [];
  const { data, error } = await supabase
    .from('pedidos')
    .select('empresa_id, total, status, origem, created_at')
    .in('empresa_id', empresaIds)
    .eq('origem', 'cardapio_online')
    .neq('status', 'cancelado');
  if (error) throw error;
  return data || [];
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

function computeMetricsFromPedidos(pedidos, empresaId) {
  const metrics = emptyMetrics();
  const sinceTs = Date.now() - THIRTY_DAYS_MS;
  (pedidos || [])
    .filter((row) => row.empresa_id === empresaId)
    .forEach((row) => {
      const total = Number(row.total) || 0;
      metrics.pedidosTotal += 1;
      metrics.faturamentoTotal += total;
      const createdTs = row.created_at ? new Date(row.created_at).getTime() : 0;
      if (createdTs >= sinceTs) {
        metrics.pedidos30d += 1;
        metrics.faturamento30d += total;
      }
    });
  return metrics;
}

/** Lista pública-segura: logo + status de atividade (sem métricas financeiras). */
export async function enrichStoresForList(supabase, stores) {
  if (!stores?.length) return [];

  const empresaIds = stores.map((row) => row.id);
  const slugs = stores.map((row) => row.slug);
  const [logoBySlug, pedidos] = await Promise.all([
    fetchLogosBySlug(supabase, slugs),
    fetchPedidosOnline(supabase, empresaIds),
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
  const pedidos = await fetchPedidosOnline(supabase, [empresaId]);
  const lastPedidoAt = buildLastOrderMap(pedidos).get(empresaId) || null;
  return {
    metrics: computeMetricsFromPedidos(pedidos, empresaId),
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