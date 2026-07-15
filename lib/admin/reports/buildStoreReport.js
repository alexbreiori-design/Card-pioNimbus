import { resolveReportPeriodWindow } from '@/lib/admin/reports/reportPeriod';

const PAYMENT_LABELS = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  credito: 'Crédito',
  debito: 'Débito',
};

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function round2(value) {
  return Math.round(safeNumber(value) * 100) / 100;
}

function getOrderTimestamp(row) {
  const raw = row?.status_concluido_em || row?.created_at;
  return raw ? new Date(raw).getTime() : 0;
}

function matchesFilters(row, filters = {}) {
  if (filters.origem && filters.origem !== 'all' && row.origem !== filters.origem) return false;
  if (filters.tipo && filters.tipo !== 'all' && row.tipo !== filters.tipo) return false;
  if (filters.pagamento && filters.pagamento !== 'all') {
    const code = String(row.forma_pagamento_codigo || '').trim();
    if (code !== filters.pagamento) return false;
  }
  return true;
}

function buildKpi(current, previous) {
  const value = round2(current);
  const prev = round2(previous);
  let changePct = 0;
  if (prev > 0) {
    changePct = round2(((value - prev) / prev) * 100);
  } else if (value > 0) {
    changePct = 100;
  }
  const progressPct = prev > 0 ? Math.min(100, round2((value / prev) * 100)) : value > 0 ? 100 : 0;
  return {
    value,
    previous: prev,
    changePct,
    progressPct,
    positive: changePct >= 0,
  };
}

function summarizeOrders(rows, entregadorNames = {}) {
  const summary = {
    pedidos: 0,
    faturamento: 0,
    subtotal: 0,
    taxaEntrega: 0,
    desconto: 0,
    itensVendidos: 0,
    pedidosComCupom: 0,
    byTipo: {
      delivery: { pedidos: 0, faturamento: 0 },
      retirada: { pedidos: 0, faturamento: 0 },
      balcao: { pedidos: 0, faturamento: 0 },
    },
    byOrigem: {
      cardapio_online: { pedidos: 0, faturamento: 0 },
      admin_manual: { pedidos: 0, faturamento: 0 },
    },
    byPagamento: {},
    byEntregador: {},
  };

  rows.forEach((row) => {
    const total = safeNumber(row.total);
    summary.pedidos += 1;
    summary.faturamento += total;
    summary.subtotal += safeNumber(row.subtotal);
    summary.taxaEntrega += safeNumber(row.taxa_entrega);
    summary.desconto += safeNumber(row.desconto);
    if (String(row.cupom_codigo || '').trim()) summary.pedidosComCupom += 1;

    const tipo = row.tipo || 'delivery';
    if (summary.byTipo[tipo]) {
      summary.byTipo[tipo].pedidos += 1;
      summary.byTipo[tipo].faturamento += total;
    }

    const origem = row.origem || 'cardapio_online';
    if (summary.byOrigem[origem]) {
      summary.byOrigem[origem].pedidos += 1;
      summary.byOrigem[origem].faturamento += total;
    }

    const pagamento = String(row.forma_pagamento_codigo || 'nao_informado').trim() || 'nao_informado';
    if (!summary.byPagamento[pagamento]) {
      summary.byPagamento[pagamento] = { pedidos: 0, faturamento: 0 };
    }
    summary.byPagamento[pagamento].pedidos += 1;
    summary.byPagamento[pagamento].faturamento += total;

    if (row.tipo === 'delivery') {
      const entregadorKey = row.entregador_id || 'sem_entregador';
      if (!summary.byEntregador[entregadorKey]) {
        summary.byEntregador[entregadorKey] = {
          id: row.entregador_id || null,
          nome:
            entregadorNames[entregadorKey] ||
            (entregadorKey === 'sem_entregador' ? 'Sem entregador' : 'Entregador'),
          pedidos: 0,
          faturamento: 0,
          taxaEntrega: 0,
        };
      }
      summary.byEntregador[entregadorKey].pedidos += 1;
      summary.byEntregador[entregadorKey].faturamento += total;
      summary.byEntregador[entregadorKey].taxaEntrega += safeNumber(row.taxa_entrega);
    }
  });

  summary.faturamento = round2(summary.faturamento);
  summary.subtotal = round2(summary.subtotal);
  summary.taxaEntrega = round2(summary.taxaEntrega);
  summary.desconto = round2(summary.desconto);
  return summary;
}

function attachItemCounts(summary, itemRows) {
  summary.itensVendidos = (itemRows || []).reduce(
    (sum, item) => sum + safeNumber(item.quantidade),
    0
  );
  return summary;
}

function aggregateProducts(itemRows, orderRows) {
  const orderIds = new Set(orderRows.map((row) => row.id));
  const byProduct = new Map();

  (itemRows || []).forEach((item) => {
    if (!orderIds.has(item.pedido_id)) return;
    const key = String(item.nome || '').trim() || 'Sem nome';
    const entry = byProduct.get(key) || {
      nome: key,
      quantidade: 0,
      faturamento: 0,
      pedidoIds: new Set(),
    };
    entry.quantidade += safeNumber(item.quantidade);
    entry.faturamento += safeNumber(item.preco_total);
    entry.pedidoIds.add(item.pedido_id);
    byProduct.set(key, entry);
  });

  return Array.from(byProduct.values());
}

function buildTopProductsByFaturamento(entries, faturamentoTotal) {
  const totalBase = faturamentoTotal > 0 ? faturamentoTotal : 1;

  return entries
    .map((entry) => {
      const pedidosComProduto = entry.pedidoIds.size;
      return {
        nome: entry.nome,
        quantidade: entry.quantidade,
        faturamento: round2(entry.faturamento),
        sharePct: round2((entry.faturamento / totalBase) * 100),
        pedidosComProduto,
        ticketMedioNoPedido:
          pedidosComProduto > 0 ? round2(entry.faturamento / pedidosComProduto) : 0,
      };
    })
    .sort((a, b) => b.faturamento - a.faturamento || b.quantidade - a.quantidade);
}

function buildTopProductsByQuantity(entries, itensVendidosTotal) {
  const totalBase = itensVendidosTotal > 0 ? itensVendidosTotal : 1;

  return entries
    .map((entry) => ({
      nome: entry.nome,
      quantidade: entry.quantidade,
      faturamento: round2(entry.faturamento),
      sharePct: round2((entry.quantidade / totalBase) * 100),
      pedidosComProduto: entry.pedidoIds.size,
    }))
    .sort((a, b) => b.quantidade - a.quantidade || b.faturamento - a.faturamento);
}

function paymentBreakdown(byPagamento) {
  return Object.entries(byPagamento || {})
    .map(([code, stats]) => ({
      code,
      label: PAYMENT_LABELS[code] || (code === 'nao_informado' ? 'Não informado' : code),
      pedidos: stats.pedidos,
      faturamento: round2(stats.faturamento),
    }))
    .sort((a, b) => b.pedidos - a.pedidos);
}

function entregadorBreakdown(byEntregador) {
  return Object.values(byEntregador || {})
    .map((row) => ({
      id: row.id,
      nome: row.nome,
      pedidos: row.pedidos,
      faturamento: round2(row.faturamento),
      taxaEntrega: round2(row.taxaEntrega),
      ticketMedio: row.pedidos > 0 ? round2(row.faturamento / row.pedidos) : 0,
    }))
    .sort((a, b) => b.pedidos - a.pedidos || b.faturamento - a.faturamento);
}

export function buildStoreReport({
  pedidos = [],
  itens = [],
  periodDays = 7,
  filters = {},
  now = Date.now(),
  entregadorNames = {},
}) {
  const window = resolveReportPeriodWindow(periodDays, now);

  const concluded = (pedidos || []).filter((row) => row.status === 'concluido');

  const currentOrders = [];
  const previousOrders = [];

  concluded.forEach((row) => {
    if (!matchesFilters(row, filters)) return;
    const ts = getOrderTimestamp(row);
    if (!ts || ts < window.previousStart) return;
    if (ts >= window.currentStart && ts <= window.currentEnd) currentOrders.push(row);
    else if (ts >= window.previousStart && ts < window.previousEnd) previousOrders.push(row);
  });

  const currentIds = new Set(currentOrders.map((row) => row.id));
  const previousIds = new Set(previousOrders.map((row) => row.id));
  const currentItems = (itens || []).filter((item) => currentIds.has(item.pedido_id));
  const previousItems = (itens || []).filter((item) => previousIds.has(item.pedido_id));

  const currentSummary = attachItemCounts(
    summarizeOrders(currentOrders, entregadorNames),
    currentItems
  );
  const previousSummary = attachItemCounts(
    summarizeOrders(previousOrders, entregadorNames),
    previousItems
  );

  const ticketMedioCurrent =
    currentSummary.pedidos > 0 ? currentSummary.faturamento / currentSummary.pedidos : 0;
  const ticketMedioPrevious =
    previousSummary.pedidos > 0 ? previousSummary.faturamento / previousSummary.pedidos : 0;

  const itensPorPedidoCurrent =
    currentSummary.pedidos > 0 ? currentSummary.itensVendidos / currentSummary.pedidos : 0;
  const itensPorPedidoPrevious =
    previousSummary.pedidos > 0 ? previousSummary.itensVendidos / previousSummary.pedidos : 0;

  const cupomSharePct =
    currentSummary.pedidos > 0
      ? round2((currentSummary.pedidosComCupom / currentSummary.pedidos) * 100)
      : 0;

  const productEntries = aggregateProducts(currentItems, currentOrders);
  const topProducts = buildTopProductsByFaturamento(productEntries, currentSummary.faturamento);
  const topProductsByQuantity = buildTopProductsByQuantity(
    productEntries,
    currentSummary.itensVendidos
  );

  return {
    periodDays: window.periodDays,
    periodLabel: window.periodLabel,
    compareLabel: window.compareLabel,
    generatedAt: new Date(now).toISOString(),
    filters: {
      origem: filters.origem || 'all',
      tipo: filters.tipo || 'all',
      pagamento: filters.pagamento || 'all',
    },
    kpis: {
      faturamento: buildKpi(currentSummary.faturamento, previousSummary.faturamento),
      pedidos: buildKpi(currentSummary.pedidos, previousSummary.pedidos),
      ticketMedio: buildKpi(ticketMedioCurrent, ticketMedioPrevious),
      itensVendidos: buildKpi(currentSummary.itensVendidos, previousSummary.itensVendidos),
      itensPorPedido: buildKpi(itensPorPedidoCurrent, itensPorPedidoPrevious),
      taxaEntrega: buildKpi(currentSummary.taxaEntrega, previousSummary.taxaEntrega),
    },
    summary: {
      faturamento: currentSummary.faturamento,
      subtotal: currentSummary.subtotal,
      taxaEntrega: currentSummary.taxaEntrega,
      desconto: currentSummary.desconto,
      pedidos: currentSummary.pedidos,
      byTipo: currentSummary.byTipo,
      byOrigem: currentSummary.byOrigem,
    },
    topProducts,
    topProductsByQuantity,
    podium: topProductsByQuantity.slice(0, 3),
    payments: paymentBreakdown(currentSummary.byPagamento),
    entregadores: entregadorBreakdown(currentSummary.byEntregador),
    cupons: {
      pedidosComCupom: currentSummary.pedidosComCupom,
      totalDesconto: currentSummary.desconto,
      sharePct: cupomSharePct,
      pedidos: currentSummary.pedidos,
    },
  };
}
