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
import { buildRouteDriverUrl, generateRoutePublicToken } from '@/lib/delivery/routePublicToken';
import {
  concludeRouteIfAllPedidosDone,
  syncRouteAfterPedidoConcluido,
} from '@/lib/delivery/routeSync';

export { concludeRouteIfAllPedidosDone, syncRouteAfterPedidoConcluido };

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
    arquivado: Boolean(row.arquivado),
    clienteNome: row.cliente_nome || 'Cliente',
    clienteTelefone: row.cliente_telefone || '',
    enderecoTexto: row.endereco_texto || '',
    total: Number(row.total || 0),
    taxaEntrega: Number(row.taxa_entrega || 0),
    lat: row.endereco_latitude != null ? Number(row.endereco_latitude) : null,
    lng: row.endereco_longitude != null ? Number(row.endereco_longitude) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    entregadorId: row.entregador_id || null,
    entregaRotaId: row.entrega_rota_id || null,
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
      'id, codigo, status, tipo, cliente_nome, cliente_telefone, endereco_texto, endereco_latitude, endereco_longitude, total, taxa_entrega, created_at, updated_at, arquivado, entregador_id, entrega_rota_id'
    )
    .eq('empresa_id', empresaId)
    .eq('tipo', 'delivery')
    .in('status', ['em_preparo', 'saiu_entrega', 'concluido'])
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;

  const filtered = (rows || []).filter((row) => {
    if (row.arquivado && row.status !== 'concluido') return false;
    if (row.status !== 'concluido') return !row.arquivado;
    return new Date(row.updated_at || row.created_at) >= concludedSince;
  });

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

export async function listActiveEntregadores(supabase, empresaId) {
  const { data, error } = await supabase
    .from('entregadores')
    .select('id, nome, telefone, ativo')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .order('nome', { ascending: true });
  if (error) {
    if (error.code === '42P01' || error.message?.includes('entregadores')) return [];
    throw error;
  }
  return data || [];
}

function mapRotaRow(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    pedidoIds: row.pedido_ids || [],
    paradas: Array.isArray(row.paradas) ? row.paradas : [],
    mapsUrl: row.maps_url,
    createdAt: row.created_at,
    status: row.status || 'ativa',
    concluidaEm: row.concluida_em || null,
    entregadorId: row.entregador_id || null,
    entregadorNome: row.entregadores?.nome || null,
    entregadorTelefone: row.entregadores?.telefone || null,
    pedidoCount: Array.isArray(row.pedido_ids) ? row.pedido_ids.length : 0,
    publicToken: row.public_token || null,
    driverUrl: row.public_token ? buildRouteDriverUrl(row.public_token) : '',
    stops: [],
  };
}

async function attachStopsToRoutes(supabase, empresaId, rotas, { syncConclude = true } = {}) {
  if (!rotas?.length) return [];

  const pedidoIds = [...new Set(rotas.flatMap((rota) => rota.pedidoIds || []).filter(Boolean))];
  let pedidosById = new Map();

  if (pedidoIds.length) {
    const { data: pedidos, error } = await supabase
      .from('pedidos')
      .select(
        'id, codigo, status, cliente_nome, cliente_telefone, endereco_texto, endereco_latitude, endereco_longitude'
      )
      .eq('empresa_id', empresaId)
      .in('id', pedidoIds);
    if (error) throw error;
    pedidosById = new Map((pedidos || []).map((item) => [item.id, item]));
  }

  const result = [];
  for (const rota of rotas) {
    if (syncConclude) {
      const closed = await concludeRouteIfAllPedidosDone(supabase, empresaId, {
        id: rota.id,
        pedido_ids: rota.pedidoIds,
      });
      if (closed) continue;
    }

    const stops = (rota.pedidoIds || []).map((id, index) => {
      const pedido = pedidosById.get(id);
      const parada = (rota.paradas || []).find((item) => item.pedidoId === id) || rota.paradas?.[index];
      return {
        pedidoId: id,
        codigo: pedido?.codigo || parada?.codigo || id,
        clienteNome: pedido?.cliente_nome || parada?.clienteNome || 'Cliente',
        clienteTelefone: pedido?.cliente_telefone || '',
        enderecoTexto: pedido?.endereco_texto || parada?.enderecoTexto || '',
        status: pedido?.status || 'desconhecido',
        entregue: pedido?.status === 'concluido',
        lat: pedido?.endereco_latitude != null ? Number(pedido.endereco_latitude) : parada?.lat ?? null,
        lng: pedido?.endereco_longitude != null ? Number(pedido.endereco_longitude) : parada?.lng ?? null,
      };
    });

    result.push({
      ...rota,
      stops,
      pedidoCount: stops.length || rota.pedidoCount || 0,
      pendingCount: stops.filter((stop) => !stop.entregue).length,
    });
  }

  return result;
}

export async function listDeliveryRoutes(
  supabase,
  empresaId,
  { status = 'ativa', limit = 30, entregadorId = '', withStops = false, syncConclude = true } = {}
) {
  let query = supabase
    .from('entrega_rotas')
    .select(
      'id, titulo, pedido_ids, paradas, maps_url, created_at, status, concluida_em, entregador_id, public_token, entregadores(id, nome, telefone)'
    )
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status === 'ativa' || status === 'concluida') {
    query = query.eq('status', status);
  }
  if (entregadorId) {
    query = query.eq('entregador_id', entregadorId);
  }

  let { data, error } = await query;

  if (error?.message?.includes('public_token') || error?.code === '42703') {
    ({ data, error } = await supabase
      .from('entrega_rotas')
      .select(
        'id, titulo, pedido_ids, paradas, maps_url, created_at, status, entregador_id, entregadores(id, nome, telefone)'
      )
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(limit));
  }

  if (error?.message?.includes('entregador') || error?.code === 'PGRST200') {
    ({ data, error } = await supabase
      .from('entrega_rotas')
      .select('id, titulo, pedido_ids, paradas, maps_url, created_at, status')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(limit));
  }
  if (error) throw error;

  const mapped = (data || []).map(mapRotaRow);
  if (!withStops) return mapped;
  return attachStopsToRoutes(supabase, empresaId, mapped, { syncConclude });
}

export async function listActiveDeliveryRoutes(supabase, empresaId) {
  return listDeliveryRoutes(supabase, empresaId, { status: 'ativa', limit: 30, withStops: true });
}

export async function concludeDeliveryRoute(supabase, empresaId, rotaId) {
  const safeId = String(rotaId || '').trim();
  if (!safeId) {
    throw Object.assign(new Error('Rota inválida.'), { status: 400 });
  }

  const { data: rota, error } = await supabase
    .from('entrega_rotas')
    .select('id, pedido_ids, status')
    .eq('id', safeId)
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (error) throw error;
  if (!rota?.id) {
    throw Object.assign(new Error('Rota não encontrada.'), { status: 404 });
  }

  const now = new Date().toISOString();
  const pedidoIds = Array.isArray(rota.pedido_ids) ? rota.pedido_ids.filter(Boolean) : [];

  if (pedidoIds.length) {
    const patch = {
      ...statusTimestampPatch('concluido'),
      arquivado: true,
      updated_at: now,
    };
    const { error: pedidosError } = await supabase
      .from('pedidos')
      .update(patch)
      .eq('empresa_id', empresaId)
      .in('id', pedidoIds)
      .in('status', ['em_preparo', 'saiu_entrega']);
    if (pedidosError) throw pedidosError;
  }

  const { data: updated, error: updateError } = await supabase
    .from('entrega_rotas')
    .update({ status: 'concluida', concluida_em: now })
    .eq('id', safeId)
    .eq('empresa_id', empresaId)
    .select('id, status, concluida_em')
    .maybeSingle();
  if (updateError) {
    if (updateError.message?.includes('concluida_em') || updateError.code === '42703') {
      const retry = await supabase
        .from('entrega_rotas')
        .update({ status: 'concluida' })
        .eq('id', safeId)
        .eq('empresa_id', empresaId)
        .select('id, status')
        .maybeSingle();
      if (retry.error) throw retry.error;
      return retry.data;
    }
    throw updateError;
  }
  return updated;
}

export async function createDeliveryRoute(supabase, empresa, pedidoDbIds = [], entregadorId = '') {
  const uniqueIds = [...new Set(pedidoDbIds.filter(Boolean))];
  if (!uniqueIds.length) {
    throw new Error('Selecione ao menos um pedido.');
  }
  if (uniqueIds.length > MAX_STOPS_PER_ROUTE) {
    throw new Error(`Selecione no máximo ${MAX_STOPS_PER_ROUTE} pedidos por rota.`);
  }

  const safeEntregadorId = String(entregadorId || '').trim();
  if (!safeEntregadorId) {
    throw new Error('Selecione o entregador responsável pela rota.');
  }

  const { data: entregador, error: entregadorError } = await supabase
    .from('entregadores')
    .select('id, nome, telefone, ativo')
    .eq('empresa_id', empresa.id)
    .eq('id', safeEntregadorId)
    .maybeSingle();
  if (entregadorError) throw entregadorError;
  if (!entregador?.id) {
    throw new Error('Entregador não encontrado.');
  }
  if (entregador.ativo === false) {
    throw new Error('Este entregador está inativo. Ative-o em Entrega ou escolha outro.');
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
  const publicToken = generateRoutePublicToken();

  const insertPayload = {
    empresa_id: empresa.id,
    titulo,
    pedido_ids: orderedStops.map((stop) => stop.pedidoId),
    paradas: orderedStops,
    maps_url: mapsUrl,
    entregador_id: entregador.id,
    status: 'ativa',
    public_token: publicToken,
    created_at: createdAt.toISOString(),
  };

  let { data: rota, error: rotaError } = await supabase
    .from('entrega_rotas')
    .insert(insertPayload)
    .select('id, titulo, maps_url, created_at, entregador_id, public_token')
    .single();

  if (rotaError?.message?.includes('public_token') || rotaError?.code === '42703') {
    const { public_token: _t, ...withoutToken } = insertPayload;
    ({ data: rota, error: rotaError } = await supabase
      .from('entrega_rotas')
      .insert(withoutToken)
      .select('id, titulo, maps_url, created_at, entregador_id')
      .single());
  }
  if (rotaError) throw rotaError;

  const now = createdAt.toISOString();
  for (const pedido of pedidos) {
    const patch = {
      entregador_id: entregador.id,
      entrega_rota_id: rota.id,
      updated_at: now,
    };
    if (pedido.status === 'em_preparo') {
      Object.assign(patch, statusTimestampPatch('saiu_entrega'));
      patch.updated_at = now;
    }
    const { error: updateError } = await supabase
      .from('pedidos')
      .update(patch)
      .eq('id', pedido.id)
      .eq('empresa_id', empresa.id);
    if (updateError) throw updateError;
  }

  const driverUrl = rota.public_token ? buildRouteDriverUrl(rota.public_token) : '';

  return {
    rota,
    titulo,
    mapsUrl,
    orderedStops,
    entregador,
    driverUrl,
  };
}

/**
 * Devolve um pedido ao Preparo (limpa entregador/rota).
 * Remove só esse stop da rota; se não restar ninguém, a rota é encerrada.
 */
export async function releaseDeliveryRoutePedidos(
  supabase,
  empresaId,
  rotaId,
  { pedidoId = null } = {}
) {
  const safeRotaId = String(rotaId || '').trim();
  if (!safeRotaId) {
    throw Object.assign(new Error('Rota inválida.'), { status: 400 });
  }

  const { data: rota, error } = await supabase
    .from('entrega_rotas')
    .select('id, pedido_ids, paradas, status, maps_url, titulo')
    .eq('id', safeRotaId)
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (error) throw error;
  if (!rota?.id) {
    throw Object.assign(new Error('Rota não encontrada.'), { status: 404 });
  }
  if (rota.status !== 'ativa') {
    throw Object.assign(new Error('Só é possível alterar rotas ativas.'), { status: 400 });
  }

  const pedidoIds = Array.isArray(rota.pedido_ids) ? rota.pedido_ids.filter(Boolean) : [];
  const safePedidoId = String(pedidoId || '').trim();
  if (!safePedidoId) {
    throw Object.assign(new Error('Informe o pedido a devolver ao preparo.'), { status: 400 });
  }
  if (!pedidoIds.includes(safePedidoId)) {
    throw Object.assign(new Error('Pedido não pertence a esta rota.'), { status: 400 });
  }
  const targetIds = [safePedidoId];

  const now = new Date().toISOString();
  const { data: pedidos, error: pedidosError } = await supabase
    .from('pedidos')
    .select('id, status')
    .eq('empresa_id', empresaId)
    .in('id', targetIds);
  if (pedidosError) throw pedidosError;

  const releasable = (pedidos || []).filter((item) => item.status !== 'concluido').map((item) => item.id);
  if (!releasable.length && pedidoId) {
    throw Object.assign(new Error('Pedido já está concluído.'), { status: 400 });
  }

  if (releasable.length) {
    const { error: updateError } = await supabase
      .from('pedidos')
      .update({
        ...statusTimestampPatch('em_preparo'),
        entregador_id: null,
        entrega_rota_id: null,
        updated_at: now,
      })
      .eq('empresa_id', empresaId)
      .in('id', releasable);
    if (updateError) throw updateError;
  }

  const remainingIds = pedidoIds.filter((id) => !releasable.includes(id));
  const paradas = Array.isArray(rota.paradas) ? rota.paradas : [];
  const remainingParadas = paradas.filter((stop) => remainingIds.includes(stop.pedidoId));

  if (!remainingIds.length) {
    const { error: closeError } = await supabase
      .from('entrega_rotas')
      .update({ status: 'concluida', concluida_em: now })
      .eq('id', safeRotaId)
      .eq('empresa_id', empresaId);
    if (closeError && !(closeError.message?.includes('concluida_em') || closeError.code === '42703')) {
      throw closeError;
    }
    if (closeError) {
      await supabase
        .from('entrega_rotas')
        .update({ status: 'concluida' })
        .eq('id', safeRotaId)
        .eq('empresa_id', empresaId);
    }
    return { releasedIds: releasable, rotaClosed: true };
  }

  const { error: rotaUpdateError } = await supabase
    .from('entrega_rotas')
    .update({
      pedido_ids: remainingIds,
      paradas: remainingParadas,
    })
    .eq('id', safeRotaId)
    .eq('empresa_id', empresaId);
  if (rotaUpdateError) throw rotaUpdateError;

  await concludeRouteIfAllPedidosDone(supabase, empresaId, {
    id: safeRotaId,
    pedido_ids: remainingIds,
  });

  return { releasedIds: releasable, rotaClosed: false, remainingIds };
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
