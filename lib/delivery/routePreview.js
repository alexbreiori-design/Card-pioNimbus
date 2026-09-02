import { haversineKm, orderStopsNearestNeighbor } from '@/lib/delivery/routeOptimization';

/** Monta paradas a partir dos pedidos selecionados no mapa. */
export function buildStopsFromOrders(orders, selectedIds) {
  const idSet = new Set(selectedIds);
  return orders
    .filter((order) => idSet.has(order.dbId) && order.lat != null && order.lng != null)
    .map((order) => ({
      pedidoId: order.dbId,
      codigo: order.codigo,
      clienteNome: order.clienteNome,
      enderecoTexto: order.enderecoTexto || '',
      lat: order.lat,
      lng: order.lng,
      entregarAte: order.entregarAte || null,
    }));
}

/** Ordem otimizada (vizinho mais próximo) a partir da loja. */
export function computeBestRouteStops(origin, stops) {
  if (!origin?.lat || !origin?.lng || !stops?.length) return [];
  return orderStopsNearestNeighbor(origin, stops);
}

/** Distâncias por perna: da loja até a 1ª parada e entre paradas seguintes. */
export function computeLegDistances(origin, orderedStops = []) {
  const fromStoreKm = orderedStops.map((stop) => haversineKm(origin, stop));
  const legKm = orderedStops.map((stop, index) => {
    if (index === 0) return fromStoreKm[0];
    return haversineKm(orderedStops[index - 1], stop);
  });
  return { fromStoreKm, legKm };
}

/** Soma aproximada da rota (loja → paradas na ordem). */
export function computeTotalRouteKm(origin, orderedStops = []) {
  if (!orderedStops.length) return 0;
  let total = haversineKm(origin, orderedStops[0]);
  for (let i = 1; i < orderedStops.length; i += 1) {
    total += haversineKm(orderedStops[i - 1], orderedStops[i]);
  }
  return total;
}

/** Reordena paradas conforme lista de IDs; valida conjunto completo. */
export function applyPedidoOrder(stops, pedidoIds) {
  const byId = new Map(stops.map((stop) => [stop.pedidoId, stop]));
  const ordered = [];
  for (const id of pedidoIds) {
    const stop = byId.get(id);
    if (!stop) {
      throw new Error('Ordem de pedidos inválida.');
    }
    ordered.push(stop);
  }
  if (ordered.length !== stops.length) {
    throw new Error('A ordem informada não corresponde aos pedidos selecionados.');
  }
  return ordered;
}

/** Formata distância para copy de UI (pt-BR). */
export function formatRouteKm(km) {
  if (!Number.isFinite(km)) return '—';
  if (km < 1) {
    const meters = Math.round(km * 1000);
    if (meters <= 0) return '< 1 m';
    return `≈ ${meters.toLocaleString('pt-BR')} m`;
  }
  return `≈ ${km.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}
