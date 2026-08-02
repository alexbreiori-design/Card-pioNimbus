import { createClient } from '@/lib/supabase/client';
import { paymentLabel } from '@/lib/caixa/caixaUtils';

export const FIADO_METHOD = 'fiado';

export const FIADO_BAIXA_METHODS = [
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
];

const MOV_TIPO_LABEL = {
  debito_pedido: 'Pedido',
  credito_baixa: 'Pagamento',
  estorno: 'Estorno',
};

export function isFiadoMethod(metodo = '') {
  return String(metodo || '') === FIADO_METHOD;
}

function mapPedidoItens(rows = []) {
  return (rows || []).map((item) => ({
    nome: item.nome || 'Item',
    qtd: Number(item.quantidade || 1),
    precoUnit: Number(item.preco_unitario || 0),
    subtotal: Number(item.preco_total || 0),
    obs: item.observacao || '',
  }));
}

export function mapContaMovimento(row) {
  if (!row) return null;
  const tipo = row.tipo;
  // Consumo (pedido) negativo; pagamento/estorno positivo.
  const signedValor =
    tipo === 'debito_pedido' ? -Number(row.valor || 0) : Number(row.valor || 0);
  const pedido = row.pedidos || null;
  return {
    id: row.id,
    empresaId: row.empresa_id,
    clienteId: row.cliente_id,
    tipo,
    tipoLabel: MOV_TIPO_LABEL[tipo] || tipo,
    valor: Number(row.valor || 0),
    signedValor,
    pedidoId: row.pedido_id || null,
    pedidoCodigo: pedido?.codigo || null,
    pedidoCreatedAt: pedido?.created_at || row.created_at,
    pedidoTotal: pedido?.total != null ? Number(pedido.total) : Number(row.valor || 0),
    itens: mapPedidoItens(pedido?.pedido_itens),
    formaRecebimento: row.forma_recebimento || null,
    formaRecebimentoLabel: row.forma_recebimento
      ? paymentLabel(row.forma_recebimento)
      : null,
    caixaTurnoId: row.caixa_turno_id || null,
    observacao: row.observacao || '',
    createdAt: row.created_at,
  };
}

export async function listClienteContaMovimentos(clienteId, empresaId, { limit = 100 } = {}) {
  if (!clienteId || !empresaId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cliente_conta_movimentos')
    .select(
      '*, pedidos(codigo, created_at, total, pedido_itens(nome, quantidade, preco_unitario, preco_total, observacao))'
    )
    .eq('empresa_id', empresaId)
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapContaMovimento);
}

export async function registrarDebitoFiadoPedido(empresaId, pedidoId) {
  if (!empresaId || !pedidoId) return null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc('fiado_debito_pedido', {
    p_empresa_id: empresaId,
    p_pedido_id: pedidoId,
  });
  if (error) throw error;
  return data || null;
}

export async function registrarEstornoFiadoPedido(empresaId, pedidoId) {
  if (!empresaId || !pedidoId) return null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc('fiado_estorno_pedido', {
    p_empresa_id: empresaId,
    p_pedido_id: pedidoId,
  });
  if (error) throw error;
  return data || null;
}

/**
 * Baixa (parcial ou total) na conta do cliente.
 * Se caixa aberto, vincula ao turno e registra movimento de recebimento.
 */
export async function registrarBaixaFiado({
  empresaId,
  clienteId,
  valor,
  formaRecebimento,
  observacao = '',
  caixaTurnoId = null,
  userId = null,
}) {
  const amount = Math.round((Number(valor) || 0) * 100) / 100;
  if (!empresaId || !clienteId) throw new Error('Cliente não identificado.');
  if (amount <= 0) throw new Error('Informe um valor válido.');
  if (!FIADO_BAIXA_METHODS.some((m) => m.value === formaRecebimento)) {
    throw new Error('Forma de recebimento inválida.');
  }

  const supabase = createClient();
  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('id, saldo_fiado, nome')
    .eq('id', clienteId)
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (clienteError) throw clienteError;
  if (!cliente) throw new Error('Cliente não encontrado.');

  const saldo = Math.round((Number(cliente.saldo_fiado) || 0) * 100) / 100;
  if (amount > saldo + 0.009) {
    throw new Error(`Valor maior que o saldo em aberto (${formatSaldoDevedor(saldo)}).`);
  }

  const { data: movimento, error: movError } = await supabase
    .from('cliente_conta_movimentos')
    .insert({
      empresa_id: empresaId,
      cliente_id: clienteId,
      tipo: 'credito_baixa',
      valor: amount,
      forma_recebimento: formaRecebimento,
      caixa_turno_id: caixaTurnoId || null,
      observacao: String(observacao || '').trim() || null,
      created_by: userId || null,
    })
    .select('*')
    .single();
  if (movError) throw movError;

  const { error: saldoError } = await supabase
    .from('clientes')
    .update({
      saldo_fiado: Math.round((saldo - amount) * 100) / 100,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clienteId)
    .eq('empresa_id', empresaId);
  if (saldoError) throw saldoError;

  let caixaMovimento = null;
  if (caixaTurnoId) {
    const { data: caixaRow, error: caixaError } = await supabase
      .from('caixa_movimentos')
      .insert({
        turno_id: caixaTurnoId,
        empresa_id: empresaId,
        tipo: 'recebimento_conta',
        valor: amount,
        descricao: `Recebimento conta · ${cliente.nome || 'Cliente'}`,
        forma_pagamento_codigo: formaRecebimento,
        cliente_conta_movimento_id: movimento.id,
        created_by: userId || null,
      })
      .select('id, tipo, valor, forma_pagamento_codigo, created_at')
      .single();
    if (caixaError) throw caixaError;
    caixaMovimento = caixaRow;
  }

  return {
    movimento: mapContaMovimento(movimento),
    novoSaldo: Math.round((saldo - amount) * 100) / 100,
    caixaMovimento,
    foraDoTurno: !caixaTurnoId,
  };
}

export function formatFiadoMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/** Saldo em aberto do cliente: exibe negativo quando há dívida. */
export function formatSaldoDevedor(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return formatFiadoMoney(0);
  return (-Math.abs(n)).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatSignedContaMoney(signedValor) {
  const n = Number(signedValor || 0);
  const formatted = Math.abs(n).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  if (n > 0) return `+ ${formatted}`;
  if (n < 0) return `− ${formatted}`;
  return formatted;
}

/** Formato curto de data/hora para mini-comanda. */
export function formatContaPedidoWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}
