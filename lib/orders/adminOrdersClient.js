import { toDbUuidOrNull } from '@/lib/dbIds';
import { createClient } from '@/lib/supabase/client';
import { normalizePhone } from '@/lib/supabase/customers';
import { mapDbPedidoToAdmin, maxOrdersUpdatedAt, statusTimestampPatch } from '@/lib/orders/mapAdminOrder';
import { syncRouteAfterPedidoConcluido } from '@/lib/delivery/routeSync';

export async function fetchLatestOrdersUpdatedAt(empresaId) {
  if (!empresaId) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from('pedidos')
    .select('updated_at')
    .eq('empresa_id', empresaId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.updated_at || null;
}

export async function fetchAdminOrders(empresaId) {
  if (!empresaId) return [];

  const supabase = createClient();
  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  if (!pedidos?.length) return [];

  const pedidoIds = pedidos.map((row) => row.id);
  const entregadorIds = [
    ...new Set(pedidos.map((row) => row.entregador_id).filter(Boolean)),
  ];

  const [{ data: itens, error: itensError }, entregadoresResult] = await Promise.all([
    supabase
      .from('pedido_itens')
      .select('pedido_id, produto_id, nome, quantidade, preco_unitario, preco_total, observacao')
      .in('pedido_id', pedidoIds),
    entregadorIds.length
      ? supabase.from('entregadores').select('id, nome, telefone').in('id', entregadorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (itensError) throw itensError;

  const entregadorById = new Map();
  if (!entregadoresResult.error) {
    (entregadoresResult.data || []).forEach((item) => {
      entregadorById.set(item.id, item);
    });
  }

  const itensByPedido = new Map();
  (itens || []).forEach((item) => {
    if (!itensByPedido.has(item.pedido_id)) itensByPedido.set(item.pedido_id, []);
    itensByPedido.get(item.pedido_id).push(item);
  });

  return pedidos.map((row) => {
    const entregador = row.entregador_id ? entregadorById.get(row.entregador_id) : null;
    return mapDbPedidoToAdmin(
      {
        ...row,
        entregadores: entregador || null,
      },
      itensByPedido.get(row.id) || []
    );
  });
}

export async function updateAdminOrderStatus({ empresaId, dbId, codigo, nextStatus }) {
  const supabase = createClient();
  const patch = statusTimestampPatch(nextStatus);
  if (nextStatus === 'concluido') {
    patch.arquivado = true;
  }
  // Voltar ao preparo/novo libera o pedido para nova rota.
  if (nextStatus === 'em_preparo' || nextStatus === 'novo') {
    patch.entregador_id = null;
    patch.entrega_rota_id = null;
  }
  let query = supabase.from('pedidos').update(patch).eq('empresa_id', empresaId);
  if (dbId) query = query.eq('id', dbId);
  else query = query.eq('codigo', String(codigo));
  const { data, error } = await query.select('id').maybeSingle();
  if (error) throw error;

  if (nextStatus === 'concluido') {
    const pedidoId = data?.id || dbId;
    if (pedidoId) {
      try {
        await syncRouteAfterPedidoConcluido(supabase, empresaId, pedidoId);
      } catch {
        // Rota pode ser sincronizada na próxima abertura do modal.
      }
    }
  }
}

export async function cancelAdminOrder({ empresaId, dbId, codigo }) {
  return updateAdminOrderStatus({ empresaId, dbId, codigo, nextStatus: 'cancelado' });
}

export async function archiveConcludedOrders(empresaId) {
  const supabase = createClient();
  const { error } = await supabase
    .from('pedidos')
    .update({ arquivado: true, updated_at: new Date().toISOString() })
    .eq('empresa_id', empresaId)
    .eq('status', 'concluido')
    .eq('arquivado', false);
  if (error) throw error;
}

export async function restoreArchivedOrder({ empresaId, dbId, codigo }) {
  const supabase = createClient();
  const now = new Date().toISOString();
  let query = supabase
    .from('pedidos')
    .update({
      arquivado: false,
      status: 'em_preparo',
      status_em_preparo_em: now,
      entregador_id: null,
      entrega_rota_id: null,
      updated_at: now,
    })
    .eq('empresa_id', empresaId);
  if (dbId) query = query.eq('id', dbId);
  else query = query.eq('codigo', String(codigo));
  const { error } = await query;
  if (error) throw error;
}

export async function insertAdminOrder({ empresaId, order, items = [] }) {
  const supabase = createClient();
  const { data: pedido, error } = await supabase
    .from('pedidos')
    .insert({
      empresa_id: empresaId,
      cliente_id: order.cliente_id || null,
      codigo: String(order.id),
      status: order.status || 'novo',
      tipo: order.tipo,
      origem: order.origem || 'admin_manual',
      cliente_nome: order.clienteNome,
      cliente_telefone: normalizePhone(order.clienteTelefone),
      endereco_texto: order.enderecoTexto || null,
      subtotal: order.subtotal,
      taxa_entrega: order.frete,
      acrescimo: order.acrescimo || 0,
      desconto: order.desconto || 0,
      total: order.total,
      forma_pagamento_codigo: order.pagamento?.metodo || null,
      cupom_codigo: order.cupomCodigo || null,
      observacao: order.observacao || null,
      entregar_ate: order.entregarAte || null,
      status_novo_em: order.createdAt || new Date().toISOString(),
      created_at: order.createdAt || new Date().toISOString(),
      caixa_turno_id: order.caixaTurnoId || null,
      aguardando_caixa: Boolean(order.aguardandoCaixa),
    })
    .select('id')
    .single();
  if (error) throw error;

  if (items.length) {
    const rows = items.map((item) => ({
      pedido_id: pedido.id,
      empresa_id: empresaId,
      produto_id: toDbUuidOrNull(item.produtoId),
      nome: item.nome,
      quantidade: item.qtd || 1,
      preco_unitario: item.precoUnit || 0,
      preco_total: item.subtotal || 0,
      observacao: item.obs || null,
    }));
    const { error: itemsError } = await supabase.from('pedido_itens').insert(rows);
    if (itemsError) throw itemsError;
  }

  return pedido.id;
}

export async function updateAdminOrder({ empresaId, order, items = [] }) {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('pedidos')
    .update({
      cliente_id: order.cliente_id || null,
      tipo: order.tipo,
      cliente_nome: order.clienteNome,
      cliente_telefone: normalizePhone(order.clienteTelefone),
      endereco_texto: order.enderecoTexto || null,
      subtotal: order.subtotal,
      taxa_entrega: order.frete,
      acrescimo: order.acrescimo || 0,
      desconto: order.desconto || 0,
      total: order.total,
      forma_pagamento_codigo: order.pagamento?.metodo || null,
      cupom_codigo: order.cupomCodigo || null,
      observacao: order.observacao || null,
      updated_at: now,
    })
    .eq('empresa_id', empresaId)
    .eq('id', order.dbId);
  if (error) throw error;

  const { error: deleteError } = await supabase.from('pedido_itens').delete().eq('pedido_id', order.dbId);
  if (deleteError) throw deleteError;

  if (items.length) {
    const rows = items.map((item) => ({
      pedido_id: order.dbId,
      empresa_id: empresaId,
      produto_id: toDbUuidOrNull(item.produtoId),
      nome: item.nome,
      quantidade: item.qtd || 1,
      preco_unitario: item.precoUnit || 0,
      preco_total: item.subtotal || 0,
      observacao: item.obs || null,
    }));
    const { error: itemsError } = await supabase.from('pedido_itens').insert(rows);
    if (itemsError) throw itemsError;
  }
}

export { maxOrdersUpdatedAt };
