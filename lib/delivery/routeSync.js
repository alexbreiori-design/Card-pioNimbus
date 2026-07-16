/** Fecha a rota se todos os pedidos já estiverem concluídos (sem re-atualizar pedidos). */
export async function concludeRouteIfAllPedidosDone(supabase, empresaId, rota) {
  const pedidoIds = Array.isArray(rota.pedido_ids)
    ? rota.pedido_ids.filter(Boolean)
    : Array.isArray(rota.pedidoIds)
      ? rota.pedidoIds.filter(Boolean)
      : [];
  if (!rota?.id || !pedidoIds.length) return false;

  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('id, status')
    .eq('empresa_id', empresaId)
    .in('id', pedidoIds);
  if (error) throw error;

  const allDone =
    (pedidos || []).length > 0 && (pedidos || []).every((item) => item.status === 'concluido');
  if (!allDone) return false;

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('entrega_rotas')
    .update({ status: 'concluida', concluida_em: now })
    .eq('id', rota.id)
    .eq('empresa_id', empresaId)
    .eq('status', 'ativa');
  if (updateError && !(updateError.message?.includes('concluida_em') || updateError.code === '42703')) {
    throw updateError;
  }
  if (updateError) {
    await supabase
      .from('entrega_rotas')
      .update({ status: 'concluida' })
      .eq('id', rota.id)
      .eq('empresa_id', empresaId)
      .eq('status', 'ativa');
  }
  return true;
}

/** Após concluir um pedido no kanban, sincroniza a rota vinculada. */
export async function syncRouteAfterPedidoConcluido(supabase, empresaId, pedidoId) {
  const safePedidoId = String(pedidoId || '').trim();
  if (!empresaId || !safePedidoId) return;

  const { data: pedido, error } = await supabase
    .from('pedidos')
    .select('id, entrega_rota_id')
    .eq('empresa_id', empresaId)
    .eq('id', safePedidoId)
    .maybeSingle();
  if (error) throw error;

  let rotaId = pedido?.entrega_rota_id || null;
  if (!rotaId) {
    const { data: rotas, error: rotasError } = await supabase
      .from('entrega_rotas')
      .select('id, pedido_ids, status')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativa')
      .contains('pedido_ids', [safePedidoId])
      .limit(5);
    if (rotasError) throw rotasError;
    rotaId = rotas?.[0]?.id || null;
  }
  if (!rotaId) return;

  const { data: rota, error: rotaError } = await supabase
    .from('entrega_rotas')
    .select('id, pedido_ids, status')
    .eq('id', rotaId)
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (rotaError) throw rotaError;
  if (!rota || rota.status !== 'ativa') return;

  await concludeRouteIfAllPedidosDone(supabase, empresaId, rota);
}
