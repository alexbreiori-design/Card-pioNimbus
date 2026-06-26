import { isSameSpDay, paymentLabel, roundMoney, spDateKey } from '@/lib/caixa/caixaUtils';

const TURNO_SELECT =
  'id, empresa_id, numero_turno, status, valor_abertura, valor_fechamento_contado, valor_esperado_dinheiro, diferenca_dinheiro, total_vendas, total_pedidos, observacao_fechamento, aberto_em, fechado_em, aberto_por, fechado_por, reaberto_em, reabertura_justificativa, reaberto_por';

export async function getEmpresaBySlug(supabase, slug) {
  const { data, error } = await supabase.from('empresas').select('id, slug').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getActiveTurno(supabase, empresaId) {
  const { data, error } = await supabase
    .from('caixa_turnos')
    .select(TURNO_SELECT)
    .eq('empresa_id', empresaId)
    .eq('status', 'aberto')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLastClosedTurnoToday(supabase, empresaId) {
  const dayKey = spDateKey();
  const { data, error } = await supabase
    .from('caixa_turnos')
    .select(TURNO_SELECT)
    .eq('empresa_id', empresaId)
    .eq('status', 'fechado')
    .order('fechado_em', { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data || []).find((row) => spDateKey(row.fechado_em || row.aberto_em) === dayKey) || null;
}

export async function countPendingCaixaOrders(supabase, empresaId) {
  const { count, error } = await supabase
    .from('pedidos')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .eq('aguardando_caixa', true)
    .neq('status', 'cancelado');
  if (error) throw error;
  return count ?? 0;
}

export async function computeTurnoSummary(supabase, turnoId) {
  const { data: turno, error: turnoError } = await supabase
    .from('caixa_turnos')
    .select('id, empresa_id, valor_abertura')
    .eq('id', turnoId)
    .maybeSingle();
  if (turnoError) throw turnoError;
  if (!turno?.id) return null;

  const { data: pedidos, error: pedidosError } = await supabase
    .from('pedidos')
    .select('id, total, forma_pagamento_codigo, troco_para, status')
    .eq('caixa_turno_id', turnoId)
    .neq('status', 'cancelado');
  if (pedidosError) throw pedidosError;

  const { data: movimentos, error: movError } = await supabase
    .from('caixa_movimentos')
    .select('tipo, valor')
    .eq('turno_id', turnoId);
  if (movError) throw movError;

  let totalVendas = 0;
  let totalPedidos = 0;
  let cashSales = 0;
  let cashTroco = 0;
  const byPayment = {};

  (pedidos || []).forEach((row) => {
    const total = Number(row.total || 0);
    totalVendas += total;
    totalPedidos += 1;
    const method = row.forma_pagamento_codigo || 'outros';
    byPayment[method] = roundMoney((byPayment[method] || 0) + total);
    if (method === 'dinheiro') {
      cashSales += total;
      cashTroco += Number(row.troco_para || 0);
    }
  });

  let sangrias = 0;
  let suprimentos = 0;
  (movimentos || []).forEach((row) => {
    if (row.tipo === 'sangria') sangrias += Number(row.valor || 0);
    if (row.tipo === 'suprimento') suprimentos += Number(row.valor || 0);
  });

  const valorAbertura = Number(turno.valor_abertura || 0);
  const esperadoDinheiro = roundMoney(valorAbertura + cashSales - cashTroco - sangrias + suprimentos);

  const pagamentos = Object.entries(byPayment)
    .map(([codigo, valor]) => ({ codigo, label: paymentLabel(codigo), valor }))
    .sort((a, b) => b.valor - a.valor);

  return {
    totalVendas: roundMoney(totalVendas),
    totalPedidos,
    cashSales: roundMoney(cashSales),
    cashTroco: roundMoney(cashTroco),
    sangrias: roundMoney(sangrias),
    suprimentos: roundMoney(suprimentos),
    valorAbertura: roundMoney(valorAbertura),
    esperadoDinheiro,
    pagamentos,
  };
}

async function nextTurnoNumber(supabase, empresaId) {
  const dayKey = spDateKey();
  const { data, error } = await supabase
    .from('caixa_turnos')
    .select('numero_turno, aberto_em')
    .eq('empresa_id', empresaId)
    .order('aberto_em', { ascending: false })
    .limit(20);
  if (error) throw error;
  const todayCount = (data || []).filter((row) => isSameSpDay(row.aberto_em, dayKey)).length;
  return todayCount + 1;
}

export async function attachPendingOrdersToTurno(supabase, empresaId, turnoId) {
  const { error } = await supabase
    .from('pedidos')
    .update({
      caixa_turno_id: turnoId,
      aguardando_caixa: false,
      updated_at: new Date().toISOString(),
    })
    .eq('empresa_id', empresaId)
    .eq('aguardando_caixa', true)
    .neq('status', 'cancelado');
  if (error) throw error;
}

export async function fetchCaixaState(supabase, empresaId) {
  const [activeTurno, pendingCount, lastClosedToday] = await Promise.all([
    getActiveTurno(supabase, empresaId),
    countPendingCaixaOrders(supabase, empresaId),
    getLastClosedTurnoToday(supabase, empresaId),
  ]);

  const summary = activeTurno ? await computeTurnoSummary(supabase, activeTurno.id) : null;
  const nextNumero = await nextTurnoNumber(supabase, empresaId);

  return {
    isOpen: Boolean(activeTurno),
    turno: activeTurno,
    summary,
    pendingCount,
    canReopen: !activeTurno && Boolean(lastClosedToday),
    lastClosedTurno: lastClosedToday,
    nextTurnoNumber: nextNumero,
  };
}

export async function openCaixaTurno(supabase, { empresaId, userId, valorAbertura }) {
  const active = await getActiveTurno(supabase, empresaId);
  if (active) {
    const err = new Error('Já existe um turno aberto.');
    err.status = 409;
    throw err;
  }

  const valor = roundMoney(valorAbertura);
  if (valor < 0) {
    const err = new Error('Valor de abertura inválido.');
    err.status = 400;
    throw err;
  }

  const numeroTurno = await nextTurnoNumber(supabase, empresaId);
  const now = new Date().toISOString();

  const { data: turno, error } = await supabase
    .from('caixa_turnos')
    .insert({
      empresa_id: empresaId,
      numero_turno: numeroTurno,
      status: 'aberto',
      valor_abertura: valor,
      aberto_em: now,
      aberto_por: userId || null,
      updated_at: now,
    })
    .select(TURNO_SELECT)
    .single();
  if (error) throw error;

  await attachPendingOrdersToTurno(supabase, empresaId, turno.id);
  const summary = await computeTurnoSummary(supabase, turno.id);
  const pendingCount = await countPendingCaixaOrders(supabase, empresaId);

  return { turno, summary, pendingCount };
}

export async function countOpenKanbanOrders(supabase, empresaId) {
  const { count, error } = await supabase
    .from('pedidos')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .eq('arquivado', false)
    .in('status', ['novo', 'em_preparo', 'saiu_entrega']);
  if (error) throw error;
  return count ?? 0;
}

export async function resolveOpenKanbanOrders(supabase, empresaId, action) {
  const normalized = String(action || '').trim().toLowerCase();
  if (normalized !== 'concluir' && normalized !== 'cancelar') {
    const err = new Error('Ação inválida para pedidos em aberto.');
    err.status = 400;
    throw err;
  }

  const now = new Date().toISOString();
  const patch =
    normalized === 'cancelar'
      ? { status: 'cancelado', updated_at: now }
      : {
          status: 'concluido',
          arquivado: true,
          status_concluido_em: now,
          updated_at: now,
        };

  const { error } = await supabase
    .from('pedidos')
    .update(patch)
    .eq('empresa_id', empresaId)
    .eq('arquivado', false)
    .in('status', ['novo', 'em_preparo', 'saiu_entrega']);
  if (error) throw error;
}

export async function closeCaixaTurno(
  supabase,
  { empresaId, userId, turnoId, valorContado, observacao, resolveOpenOrders }
) {
  const { data: turno, error: turnoError } = await supabase
    .from('caixa_turnos')
    .select(TURNO_SELECT)
    .eq('id', turnoId)
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (turnoError) throw turnoError;
  if (!turno?.id || turno.status !== 'aberto') {
    const err = new Error('Turno não encontrado ou já fechado.');
    err.status = 404;
    throw err;
  }

  const openOrdersCount = await countOpenKanbanOrders(supabase, empresaId);
  if (openOrdersCount > 0) {
    if (!resolveOpenOrders) {
      const err = new Error('Ainda existem pedidos em aberto.');
      err.status = 409;
      err.openOrdersCount = openOrdersCount;
      throw err;
    }
    await resolveOpenKanbanOrders(supabase, empresaId, resolveOpenOrders);
  }

  const summary = await computeTurnoSummary(supabase, turnoId);
  const contado = roundMoney(valorContado);
  if (contado < 0) {
    const err = new Error('Valor contado inválido.');
    err.status = 400;
    throw err;
  }

  const diferenca = roundMoney(contado - summary.esperadoDinheiro);
  const now = new Date().toISOString();

  const { data: closed, error } = await supabase
    .from('caixa_turnos')
    .update({
      status: 'fechado',
      valor_fechamento_contado: contado,
      valor_esperado_dinheiro: summary.esperadoDinheiro,
      diferenca_dinheiro: diferenca,
      total_vendas: summary.totalVendas,
      total_pedidos: summary.totalPedidos,
      observacao_fechamento: observacao?.trim() || null,
      fechado_em: now,
      fechado_por: userId || null,
      updated_at: now,
    })
    .eq('id', turnoId)
    .select(TURNO_SELECT)
    .single();
  if (error) throw error;

  return { turno: closed, summary, diferenca };
}

export async function reopenCaixaTurno(supabase, { empresaId, userId, turnoId, justificativa, valorGaveta }) {
  const active = await getActiveTurno(supabase, empresaId);
  if (active) {
    const err = new Error('Já existe um turno aberto.');
    err.status = 409;
    throw err;
  }

  const just = String(justificativa || '').trim();
  if (just.length < 5) {
    const err = new Error('Informe a justificativa da reabertura.');
    err.status = 400;
    throw err;
  }

  const valor = roundMoney(valorGaveta);
  if (valor < 0) {
    const err = new Error('Valor da gaveta inválido.');
    err.status = 400;
    throw err;
  }

  const { data: turno, error: turnoError } = await supabase
    .from('caixa_turnos')
    .select(TURNO_SELECT)
    .eq('id', turnoId)
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (turnoError) throw turnoError;
  if (!turno?.id || turno.status !== 'fechado') {
    const err = new Error('Turno não encontrado ou não está fechado.');
    err.status = 404;
    throw err;
  }
  if (!isSameSpDay(turno.fechado_em || turno.aberto_em, new Date())) {
    const err = new Error('Só é possível reabrir turnos fechados hoje.');
    err.status = 400;
    throw err;
  }

  const now = new Date().toISOString();
  const { data: reopened, error } = await supabase
    .from('caixa_turnos')
    .update({
      status: 'aberto',
      valor_abertura: valor,
      valor_fechamento_contado: null,
      valor_esperado_dinheiro: null,
      diferenca_dinheiro: null,
      observacao_fechamento: null,
      fechado_em: null,
      fechado_por: null,
      reaberto_em: now,
      reabertura_justificativa: just,
      reaberto_por: userId || null,
      updated_at: now,
    })
    .eq('id', turnoId)
    .select(TURNO_SELECT)
    .single();
  if (error) throw error;

  const summary = await computeTurnoSummary(supabase, turnoId);
  return { turno: reopened, summary };
}

export async function addCaixaMovimento(supabase, { empresaId, userId, turnoId, tipo, valor, descricao }) {
  const active = await getActiveTurno(supabase, empresaId);
  if (!active || active.id !== turnoId) {
    const err = new Error('Turno ativo inválido.');
    err.status = 400;
    throw err;
  }

  const amount = roundMoney(valor);
  if (amount <= 0) {
    const err = new Error('Valor inválido.');
    err.status = 400;
    throw err;
  }

  const { data, error } = await supabase
    .from('caixa_movimentos')
    .insert({
      turno_id: turnoId,
      empresa_id: empresaId,
      tipo,
      valor: amount,
      descricao: descricao?.trim() || null,
      created_by: userId || null,
    })
    .select('id, tipo, valor, descricao, created_at')
    .single();
  if (error) throw error;

  const summary = await computeTurnoSummary(supabase, turnoId);
  return { movimento: data, summary };
}

export async function fetchCaixaHistorico(supabase, empresaId, days = 30) {
  const safeDays = Math.max(1, Math.min(90, Number(days) || 30));
  const since = new Date();
  since.setDate(since.getDate() - safeDays);

  const { data, error } = await supabase
    .from('caixa_turnos')
    .select(TURNO_SELECT)
    .eq('empresa_id', empresaId)
    .gte('aberto_em', since.toISOString())
    .order('aberto_em', { ascending: false })
    .limit(200);
  if (error) throw error;

  const rows = data || [];
  const byDay = new Map();

  rows.forEach((row) => {
    const key = spDateKey(row.aberto_em);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(row);
  });

  return Array.from(byDay.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, turnos]) => ({
      date,
      turnos: turnos.sort((a, b) => a.numero_turno - b.numero_turno),
    }));
}

export function mapTurnoToClient(row) {
  if (!row) return null;
  return {
    id: row.id,
    numeroTurno: row.numero_turno,
    status: row.status,
    valorAbertura: Number(row.valor_abertura || 0),
    valorFechamentoContado: row.valor_fechamento_contado != null ? Number(row.valor_fechamento_contado) : null,
    valorEsperadoDinheiro: row.valor_esperado_dinheiro != null ? Number(row.valor_esperado_dinheiro) : null,
    diferencaDinheiro: row.diferenca_dinheiro != null ? Number(row.diferenca_dinheiro) : null,
    totalVendas: Number(row.total_vendas || 0),
    totalPedidos: Number(row.total_pedidos || 0),
    observacaoFechamento: row.observacao_fechamento || '',
    abertoEm: row.aberto_em,
    fechadoEm: row.fechado_em,
    reabertoEm: row.reaberto_em,
    reaberturaJustificativa: row.reabertura_justificativa || '',
  };
}
