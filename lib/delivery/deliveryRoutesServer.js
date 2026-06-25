import { geocodeAddress } from '@/lib/delivery/geocode';
import { formatAddressForGeocode } from '@/lib/delivery/formatAddress';
import {
  buildGoogleMapsRouteUrl,
  formatRouteTitle,
  MAX_STOPS_PER_ROUTE,
  orderStopsNearestNeighbor,
} from '@/lib/delivery/routeOptimization';
import { statusTimestampPatch } from '@/lib/orders/mapAdminOrder';
import { normalizeSlug } from '@/lib/normalize';
import { getLocationIqKey, hasGeocodeApiKey } from '@/lib/env/server';

const CONCLUDED_DAYS = 7;
const GEOCODE_BATCH_LIMIT = 8;

export async function getEmpresaForRoutes(supabase, slug) {
  const safeSlug = normalizeSlug(slug);
  const { data, error } = await supabase
    .from('empresas')
    .select(
      'id, slug, nome, latitude, longitude, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep'
    )
    .eq('slug', safeSlug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function mapPedidoToMapOrder(row) {
  return {
    dbId: row.id,
    codigo: row.codigo || row.id,
    status: row.status,
    clienteNome: row.cliente_nome || 'Cliente',
    enderecoTexto: row.endereco_texto || '',
    total: Number(row.total || 0),
    taxaEntrega: Number(row.taxa_entrega || 0),
    lat: row.endereco_latitude != null ? Number(row.endereco_latitude) : null,
    lng: row.endereco_longitude != null ? Number(row.endereco_longitude) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function geocodePedido(supabase, pedido) {
  if (!hasGeocodeApiKey()) return null;

  const query =
    pedido.endereco_texto?.trim() ||
    formatAddressForGeocode({
      logradouro: pedido.endereco_logradouro,
      numero: pedido.endereco_numero,
      bairro: pedido.endereco_bairro,
      cidade: pedido.endereco_cidade,
      estado: pedido.endereco_estado,
      cep: pedido.endereco_cep,
    });

  if (!query.replace(/[, Brasil]/g, '').trim()) return null;

  try {
    const apiKey = getLocationIqKey();
    let coords;
    if (pedido.endereco_logradouro || pedido.endereco_bairro) {
      coords = await geocodeAddress(
        {
          logradouro: pedido.endereco_logradouro,
          numero: pedido.endereco_numero,
          bairro: pedido.endereco_bairro,
          cidade: pedido.endereco_cidade,
          estado: pedido.endereco_estado,
          cep: pedido.endereco_cep,
        },
        apiKey
      );
    } else {
      coords = await geocodeAddress({ logradouro: query }, apiKey);
    }

    const patch = {
      endereco_latitude: coords.latitude,
      endereco_longitude: coords.longitude,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('pedidos').update(patch).eq('id', pedido.id);
    if (error) throw error;
    return coords;
  } catch {
    return null;
  }
}

export async function fetchDeliveryMapData(supabase, empresaId, { geocodeMissing = true } = {}) {
  const concludedSince = new Date();
  concludedSince.setDate(concludedSince.getDate() - CONCLUDED_DAYS);

  const { data: rows, error } = await supabase
    .from('pedidos')
    .select(
      'id, codigo, status, tipo, cliente_nome, endereco_texto, endereco_latitude, endereco_longitude, total, taxa_entrega, created_at, updated_at'
    )
    .eq('empresa_id', empresaId)
    .eq('tipo', 'delivery')
    .eq('arquivado', false)
    .in('status', ['em_preparo', 'saiu_entrega', 'concluido'])
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;

  const filtered = (rows || []).filter(
    (row) => row.status !== 'concluido' || new Date(row.updated_at || row.created_at) >= concludedSince
  );

  let geocodedCount = 0;
  if (geocodeMissing && hasGeocodeApiKey()) {
    for (const row of filtered) {
      if (geocodedCount >= GEOCODE_BATCH_LIMIT) break;
      if (row.endereco_latitude != null && row.endereco_longitude != null) continue;
      const coords = await geocodePedido(supabase, row);
      if (coords) {
        row.endereco_latitude = coords.latitude;
        row.endereco_longitude = coords.longitude;
        geocodedCount += 1;
      }
    }
  }

  const orders = filtered.map(mapPedidoToMapOrder);
  const mappable = orders.filter((order) => order.lat != null && order.lng != null);
  const pendingGeocode = orders.filter((order) => order.lat == null || order.lng == null);

  return { orders, mappable, pendingGeocode, geocodedCount };
}

export async function createDeliveryRoute(supabase, empresa, pedidoDbIds = []) {
  const uniqueIds = [...new Set(pedidoDbIds.filter(Boolean))];
  if (!uniqueIds.length) {
    throw new Error('Selecione ao menos um pedido.');
  }
  if (uniqueIds.length > MAX_STOPS_PER_ROUTE) {
    throw new Error(`Selecione no máximo ${MAX_STOPS_PER_ROUTE} pedidos por rota.`);
  }

  const storeLat = Number(empresa.latitude);
  const storeLng = Number(empresa.longitude);
  if (!Number.isFinite(storeLat) || !Number.isFinite(storeLng)) {
    throw new Error(
      'A loja ainda não tem coordenadas. Salve o endereço em Minha loja ou recalcule em Entrega.'
    );
  }

  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select(
      'id, codigo, status, tipo, cliente_nome, endereco_texto, endereco_latitude, endereco_longitude, taxa_entrega'
    )
    .eq('empresa_id', empresa.id)
    .in('id', uniqueIds);
  if (error) throw error;
  if ((pedidos || []).length !== uniqueIds.length) {
    throw new Error('Um ou mais pedidos selecionados não foram encontrados.');
  }

  for (const pedido of pedidos) {
    if (pedido.tipo !== 'delivery') {
      throw new Error('Somente pedidos de delivery entram na rota.');
    }
    if (!['em_preparo', 'saiu_entrega'].includes(pedido.status)) {
      throw new Error('Selecione apenas pedidos em preparo ou saiu para entrega.');
    }
  }

  const stops = [];
  for (const pedido of pedidos) {
    let lat = pedido.endereco_latitude != null ? Number(pedido.endereco_latitude) : null;
    let lng = pedido.endereco_longitude != null ? Number(pedido.endereco_longitude) : null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const coords = await geocodePedido(supabase, pedido);
      if (!coords) {
        throw new Error(
          `Não foi possível localizar o endereço do pedido #${pedido.codigo || pedido.id}.`
        );
      }
      lat = coords.latitude;
      lng = coords.longitude;
    }
    stops.push({
      pedidoId: pedido.id,
      codigo: pedido.codigo || pedido.id,
      clienteNome: pedido.cliente_nome || 'Cliente',
      enderecoTexto: pedido.endereco_texto || '',
      lat,
      lng,
    });
  }

  const origin = { lat: storeLat, lng: storeLng };
  const orderedStops = orderStopsNearestNeighbor(origin, stops);
  const mapsUrl = buildGoogleMapsRouteUrl(origin, orderedStops);
  if (!mapsUrl) throw new Error('Não foi possível gerar o link do Google Maps.');

  const createdAt = new Date();
  const titulo = formatRouteTitle(createdAt);

  const { data: rota, error: rotaError } = await supabase
    .from('entrega_rotas')
    .insert({
      empresa_id: empresa.id,
      titulo,
      pedido_ids: orderedStops.map((stop) => stop.pedidoId),
      paradas: orderedStops,
      maps_url: mapsUrl,
      created_at: createdAt.toISOString(),
    })
    .select('id, titulo, maps_url, created_at')
    .single();
  if (rotaError) throw rotaError;

  const now = createdAt.toISOString();
  for (const pedido of pedidos) {
    if (pedido.status === 'em_preparo') {
      const patch = statusTimestampPatch('saiu_entrega');
      patch.updated_at = now;
      const { error: updateError } = await supabase
        .from('pedidos')
        .update(patch)
        .eq('id', pedido.id)
        .eq('empresa_id', empresa.id);
      if (updateError) throw updateError;
    }
  }

  return {
    rota,
    titulo,
    mapsUrl,
    orderedStops,
  };
}

export function mapStoreOrigin(empresa) {
  const lat = Number(empresa?.latitude);
  const lng = Number(empresa?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    label: empresa?.nome || 'Loja',
  };
}
