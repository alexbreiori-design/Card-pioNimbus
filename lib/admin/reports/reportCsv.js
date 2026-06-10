function escapeCsv(value) {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2).replace('.', ',');
}

export function buildReportCsv(report) {
  if (!report) return '';

  const lines = [
    `Relatório Nimbus — ${report.periodLabel}`,
    `Gerado em;${new Date(report.generatedAt).toLocaleString('pt-BR')}`,
    '',
    'Indicador;Período atual;Período anterior;Variação %',
    `Faturamento;${formatMoney(report.kpis.faturamento.value)};${formatMoney(report.kpis.faturamento.previous)};${report.kpis.faturamento.changePct}`,
    `Pedidos;${report.kpis.pedidos.value};${report.kpis.pedidos.previous};${report.kpis.pedidos.changePct}`,
    `Ticket médio;${formatMoney(report.kpis.ticketMedio.value)};${formatMoney(report.kpis.ticketMedio.previous)};${report.kpis.ticketMedio.changePct}`,
    `Itens vendidos;${report.kpis.itensVendidos.value};${report.kpis.itensVendidos.previous};${report.kpis.itensVendidos.changePct}`,
    `Itens por pedido;${report.kpis.itensPorPedido.value};${report.kpis.itensPorPedido.previous};${report.kpis.itensPorPedido.changePct}`,
    `Taxa de entrega;${formatMoney(report.kpis.taxaEntrega.value)};${formatMoney(report.kpis.taxaEntrega.previous)};${report.kpis.taxaEntrega.changePct}`,
    '',
    'Top produtos',
    'Produto;Qtd vendida;Faturamento;% do faturamento;Pedidos com produto;Ticket médio no pedido',
  ];

  (report.topProducts || []).forEach((row) => {
    lines.push(
      [
        escapeCsv(row.nome),
        row.quantidade,
        formatMoney(row.faturamento),
        row.sharePct,
        row.pedidosComProduto,
        formatMoney(row.ticketMedioNoPedido),
      ].join(';')
    );
  });

  return lines.join('\n');
}
