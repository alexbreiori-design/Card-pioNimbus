export const RECENT_ORDER_DAYS = 14;
export const NEW_STORE_DAYS = 14;

const MS_DAY = 24 * 60 * 60 * 1000;

export function resolveStoreActivityStatus({ createdAt, lastPedidoAt, now = Date.now() }) {
  const createdTs = createdAt ? new Date(createdAt).getTime() : 0;
  const lastOrderTs = lastPedidoAt ? new Date(lastPedidoAt).getTime() : 0;
  const ageDays = createdTs ? (now - createdTs) / MS_DAY : 999;

  if (lastOrderTs && now - lastOrderTs <= RECENT_ORDER_DAYS * MS_DAY) {
    return 'ativa';
  }
  if (ageDays <= NEW_STORE_DAYS && !lastOrderTs) {
    return 'nova';
  }
  return 'sem_pedido_recente';
}

export function activityStatusLabel(status) {
  if (status === 'ativa') return 'Ativa';
  if (status === 'nova') return 'Nova';
  return 'Sem pedido recente';
}

/** Agrega último pedido online por empresa (sem expor totais na lista). */
export function buildLastOrderMap(pedidos) {
  const map = new Map();
  (pedidos || []).forEach((row) => {
    if (!row?.empresa_id || !row?.created_at) return;
    const prev = map.get(row.empresa_id);
    if (!prev || new Date(row.created_at).getTime() > new Date(prev).getTime()) {
      map.set(row.empresa_id, row.created_at);
    }
  });
  return map;
}
