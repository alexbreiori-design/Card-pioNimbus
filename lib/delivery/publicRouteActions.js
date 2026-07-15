import { statusTimestampPatch } from '@/lib/orders/mapAdminOrder';
import { buildRouteDriverUrl } from '@/lib/delivery/routePublicToken';

function mapPublicStop(pedido, parada) {
  return {
    pedidoId: pedido.id,
    codigo: pedido.codigo || pedido.id,
    clienteNome: pedido.cliente_nome || parada?.clienteNome || 'Cliente',
    enderecoTexto: pedido.endereco_texto || parada?.enderecoTexto || '',
    telefone: pedido.cliente_telefone || '',
    status: pedido.status,
    entregue: pedido.status === 'concluido',
  };
}

export async function loadPublicDeliveryRoute(supabase, token) {
  const safeToken = String(token || '').trim();
  if (!safeToken) {
    throw Object.assign(new Error('Link inválido.'), { status: 400 });
  }

  const { data: rota, error } = await supabase
    .from('entrega_rotas')
    .select(
      'id, empresa_id, titulo, pedido_ids, paradas, maps_url, status, public_token, entregador_id, created_at, entregadores(id, nome), empresas(nome)'
    )
    .eq('public_token', safeToken)
    .maybeSingle();
  if (error) throw error;
  if (!rota?.id) {
    throw Object.assign(new Error('Rota não encontrada ou link expirado.'), { status: 404 });
  }

  const pedidoIds = Array.isArray(rota.pedido_ids) ? rota.pedido_ids.filter(Boolean) : [];
  let pedidos = [];
  if (pedidoIds.length) {
    const { data, error: pedidosError } = await supabase
      .from('pedidos')
      .select('id, codigo, status, cliente_nome, cliente_telefone, endereco_texto')
      .eq('empresa_id', rota.empresa_id)
      .in('id', pedidoIds);
    if (pedidosError) throw pedidosError;
    pedidos = data || [];
  }

  const byId = new Map(pedidos.map((item) => [item.id, item]));
  const paradas = Array.isArray(rota.paradas) ? rota.paradas : [];
  const stops = pedidoIds.map((id, index) => {
    const pedido = byId.get(id);
    const parada = paradas.find((item) => item.pedidoId === id) || paradas[index] || null;
    if (!pedido) {
      return {
        pedidoId: id,
        codigo: parada?.codigo || id,
        clienteNome: parada?.clienteNome || 'Cliente',
        enderecoTexto: parada?.enderecoTexto || '',
        telefone: '',
        status: 'desconhecido',
        entregue: false,
      };
    }
    return mapPublicStop(pedido, parada);
  });

  const pending = stops.filter((stop) => !stop.entregue).length;

  return {
    id: rota.id,
    titulo: rota.titulo,
    status: rota.status || 'ativa',
    mapsUrl: rota.maps_url,
    driverUrl: buildRouteDriverUrl(rota.public_token),
    createdAt: rota.created_at,
    lojaNome: rota.empresas?.nome || 'Loja',
    entregadorNome: rota.entregadores?.nome || '',
    stops,
    pendingCount: pending,
    allDone: pending === 0,
  };
}

async function maybeConcludeRoute(supabase, rota) {
  const pedidoIds = Array.isArray(rota.pedido_ids) ? rota.pedido_ids.filter(Boolean) : [];
  if (!pedidoIds.length) return;

  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('id, status')
    .eq('empresa_id', rota.empresa_id)
    .in('id', pedidoIds);
  if (error) throw error;

  const allDone = (pedidos || []).every((item) => item.status === 'concluido');
  if (!allDone) return;

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('entrega_rotas')
    .update({ status: 'concluida', concluida_em: now })
    .eq('id', rota.id)
    .eq('empresa_id', rota.empresa_id);
  if (updateError && !(updateError.message?.includes('concluida_em') || updateError.code === '42703')) {
    throw updateError;
  }
  if (updateError) {
    await supabase
      .from('entrega_rotas')
      .update({ status: 'concluida' })
      .eq('id', rota.id)
      .eq('empresa_id', rota.empresa_id);
  }
}

export async function markPublicRouteDelivered(supabase, token, { pedidoId = null, all = false } = {}) {
  const safeToken = String(token || '').trim();
  if (!safeToken) {
    throw Object.assign(new Error('Link inválido.'), { status: 400 });
  }

  const { data: rota, error } = await supabase
    .from('entrega_rotas')
    .select('id, empresa_id, pedido_ids, status, public_token')
    .eq('public_token', safeToken)
    .maybeSingle();
  if (error) throw error;
  if (!rota?.id) {
    throw Object.assign(new Error('Rota não encontrada ou link expirado.'), { status: 404 });
  }

  const pedidoIds = Array.isArray(rota.pedido_ids) ? rota.pedido_ids.filter(Boolean) : [];
  const targetIds = all
    ? pedidoIds
    : pedidoId && pedidoIds.includes(pedidoId)
      ? [pedidoId]
      : [];

  if (!targetIds.length) {
    throw Object.assign(new Error('Pedido inválido para esta rota.'), { status: 400 });
  }

  const now = new Date().toISOString();
  const patch = {
    ...statusTimestampPatch('concluido'),
    updated_at: now,
  };

  const { error: updateError } = await supabase
    .from('pedidos')
    .update(patch)
    .eq('empresa_id', rota.empresa_id)
    .in('id', targetIds)
    .in('status', ['em_preparo', 'saiu_entrega']);
  if (updateError) throw updateError;

  await maybeConcludeRoute(supabase, rota);
  return loadPublicDeliveryRoute(supabase, safeToken);
}
