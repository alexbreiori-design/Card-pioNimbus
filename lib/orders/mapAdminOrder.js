const PAYMENT_LABEL = {
  debito: 'Débito',
  credito: 'Crédito',
  pix: 'Pix',
  dinheiro: 'Dinheiro',
};

function buildHistorico(row) {
  const historico = [];
  const push = (status, at) => {
    if (at) historico.push({ status, at });
  };
  push('novo', row.status_novo_em || row.created_at);
  push('em_preparo', row.status_em_preparo_em);
  push('saiu_entrega', row.status_saiu_entrega_em);
  push('concluido', row.status_concluido_em);
  if (row.status === 'cancelado') {
    historico.push({ status: 'cancelado', at: row.updated_at || row.created_at });
  }
  return historico.sort((a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime());
}

export function mapDbItemToAdmin(item) {
  return {
    nome: item.nome,
    qtd: Number(item.quantidade || 1),
    precoUnit: Number(item.preco_unitario || 0),
    subtotal: Number(item.preco_total || 0),
    obs: item.observacao || '',
    produtoId: item.produto_id || null,
  };
}

export function mapDbPedidoToAdmin(row, itens = []) {
  if (!row) return null;
  return {
    id: row.codigo || row.id,
    dbId: row.id,
    status: row.status,
    tipo: row.tipo,
    clienteNome: row.cliente_nome || '',
    clienteTelefone: row.cliente_telefone || '',
    customer_id: row.cliente_id || null,
    createdAt: row.created_at,
    prazo: row.entregar_ate
      ? new Date(row.entregar_ate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '',
    entregarAte: row.entregar_ate,
    endereco: null,
    enderecoTexto: row.endereco_texto || '',
    enderecoLatitude: row.endereco_latitude != null ? Number(row.endereco_latitude) : null,
    enderecoLongitude: row.endereco_longitude != null ? Number(row.endereco_longitude) : null,
    distanciaKm: row.distancia_km != null ? Number(row.distancia_km) : null,
    observacao: row.observacao || '',
    itens: (itens || []).map(mapDbItemToAdmin),
    subtotal: Number(row.subtotal || 0),
    frete: Number(row.taxa_entrega || 0),
    acrescimo: Number(row.acrescimo || 0),
    desconto: Number(row.desconto || 0),
    cupomCodigo: row.cupom_codigo || '',
    total: Number(row.total || 0),
    historico: buildHistorico(row),
    pagamento: {
      metodo: row.forma_pagamento_codigo || '',
      recebido: Number(row.total || 0),
      troco: 0,
    },
    arquivado: Boolean(row.arquivado),
    autoImported: row.origem === 'cardapio_online',
    aguardandoCaixa: Boolean(row.aguardando_caixa),
    caixaTurnoId: row.caixa_turno_id || null,
    updatedAt: row.updated_at,
    entregadorId: row.entregador_id || null,
    entregaRotaId: row.entrega_rota_id || null,
    entregadorNome: row.entregadores?.nome || row.entregador_nome || null,
  };
}

export function statusTimestampPatch(nextStatus) {
  const now = new Date().toISOString();
  const patch = { status: nextStatus, updated_at: now };
  if (nextStatus === 'novo') patch.status_novo_em = now;
  if (nextStatus === 'em_preparo') patch.status_em_preparo_em = now;
  if (nextStatus === 'saiu_entrega') patch.status_saiu_entrega_em = now;
  if (nextStatus === 'concluido') patch.status_concluido_em = now;
  return patch;
}

export function paymentLabelForOrder(order) {
  return PAYMENT_LABEL[order?.pagamento?.metodo] || order?.pagamento?.metodo || '—';
}

export function maxOrdersUpdatedAt(rows) {
  if (!rows?.length) return null;
  return rows.reduce((max, row) => {
    const ts = row.updated_at || row.updatedAt;
    if (!ts) return max;
    if (!max || new Date(ts).getTime() > new Date(max).getTime()) return ts;
    return max;
  }, null);
}
