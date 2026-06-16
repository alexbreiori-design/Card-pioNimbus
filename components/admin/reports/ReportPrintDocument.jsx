'use client';

import {
  describeReportFilters,
  formatCurrency,
  formatNumber,
  formatPct,
} from '@/lib/admin/reports/reportFormatters';

const KPI_ROWS = [
  { key: 'faturamento', label: 'Faturamento', format: 'currency' },
  { key: 'pedidos', label: 'Pedidos', format: 'number' },
  { key: 'ticketMedio', label: 'Ticket médio', format: 'currency' },
  { key: 'itensVendidos', label: 'Itens vendidos', format: 'number' },
  { key: 'itensPorPedido', label: 'Itens por pedido', format: 'decimal' },
  { key: 'taxaEntrega', label: 'Taxa de entrega', format: 'currency' },
];

function formatKpiValue(value, format) {
  if (format === 'currency') return formatCurrency(value);
  if (format === 'decimal') return formatNumber(value, 2);
  return formatNumber(value, 0);
}

export default function ReportPrintDocument({ report, storeName }) {
  if (!report) return null;

  const generatedLabel = new Date(report.generatedAt).toLocaleString('pt-BR');
  const topByRevenue = (report.topProducts || []).slice(0, 20);
  const topByQuantity = (report.topProductsByQuantity || report.podium || []).slice(0, 10);
  const payments = (report.payments || []).slice(0, 6);

  return (
    <div className="report-print-root">
      <article className="report-print-page">
        <header className="report-print-header">
          <div className="report-print-brand">
            <span className="report-print-brand-mark">Nimbus</span>
            <span className="report-print-brand-type">Relatório de vendas</span>
          </div>
          <div className="report-print-meta">
            <p>
              <strong>Loja:</strong> {storeName || '—'}
            </p>
            <p>
              <strong>Período:</strong> {report.periodLabel}
            </p>
            <p>
              <strong>Comparativo:</strong> {report.compareLabel}
            </p>
            <p>
              <strong>Gerado em:</strong> {generatedLabel}
            </p>
            <p>
              <strong>Filtros:</strong> {describeReportFilters(report.filters)}
            </p>
          </div>
        </header>

        <section className="report-print-section">
          <h2>Indicadores principais</h2>
          <div className="report-print-kpi-grid">
            {KPI_ROWS.map((item) => {
              const kpi = report.kpis?.[item.key];
              return (
                <div key={item.key} className="report-print-kpi">
                  <span className="report-print-kpi-label">{item.label}</span>
                  <strong className="report-print-kpi-value">
                    {formatKpiValue(kpi?.value, item.format)}
                  </strong>
                  <span className="report-print-kpi-sub">
                    Anterior: {formatKpiValue(kpi?.previous, item.format)} · {formatPct(kpi?.changePct)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="report-print-section">
          <h2>Top por faturamento</h2>
          {topByRevenue.length ? (
            <table className="report-print-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Faturamento</th>
                  <th>% fat.</th>
                  <th>Pedidos</th>
                </tr>
              </thead>
              <tbody>
                {topByRevenue.map((row, index) => (
                  <tr key={row.nome}>
                    <td>{index + 1}</td>
                    <td>{row.nome}</td>
                    <td>{formatNumber(row.quantidade)}</td>
                    <td>{formatCurrency(row.faturamento)}</td>
                    <td>{formatNumber(row.sharePct, 1)}%</td>
                    <td>{formatNumber(row.pedidosComProduto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="report-print-empty">Sem vendas no período.</p>
          )}
        </section>

        <section className="report-print-section">
          <h2>Mais vendidos (quantidade)</h2>
          {topByQuantity.length ? (
            <table className="report-print-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Produto</th>
                  <th>Qtd vendida</th>
                  <th>% vendas</th>
                  <th>Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {topByQuantity.map((row, index) => (
                  <tr key={`${row.nome}-qty`}>
                    <td>{index + 1}</td>
                    <td>{row.nome}</td>
                    <td>{formatNumber(row.quantidade)}</td>
                    <td>{formatNumber(row.sharePct, 1)}%</td>
                    <td>{formatCurrency(row.faturamento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="report-print-empty">Sem vendas no período.</p>
          )}
        </section>

        <div className="report-print-columns">
          <section className="report-print-section">
            <h2>Resumo do período</h2>
            <table className="report-print-table report-print-table-compact">
              <tbody>
                <tr>
                  <td>Delivery</td>
                  <td>{formatCurrency(report.summary.byTipo.delivery.faturamento)}</td>
                  <td>{formatNumber(report.summary.byTipo.delivery.pedidos)} ped.</td>
                </tr>
                <tr>
                  <td>Retirada</td>
                  <td>{formatCurrency(report.summary.byTipo.retirada.faturamento)}</td>
                  <td>{formatNumber(report.summary.byTipo.retirada.pedidos)} ped.</td>
                </tr>
                <tr>
                  <td>Balcão</td>
                  <td>{formatCurrency(report.summary.byTipo.balcao.faturamento)}</td>
                  <td>{formatNumber(report.summary.byTipo.balcao.pedidos)} ped.</td>
                </tr>
                <tr className="is-highlight">
                  <td>Faturamento total</td>
                  <td colSpan={2}>{formatCurrency(report.summary.faturamento)}</td>
                </tr>
                <tr>
                  <td>Cardápio online</td>
                  <td>{formatCurrency(report.summary.byOrigem.cardapio_online.faturamento)}</td>
                  <td>{formatNumber(report.summary.byOrigem.cardapio_online.pedidos)} ped.</td>
                </tr>
                <tr>
                  <td>Balcão/Admin</td>
                  <td>{formatCurrency(report.summary.byOrigem.admin_manual.faturamento)}</td>
                  <td>{formatNumber(report.summary.byOrigem.admin_manual.pedidos)} ped.</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="report-print-section">
            <h2>Pagamentos e cupons</h2>
            <div className="report-print-highlight-box">
              <span>Pedidos concluídos</span>
              <strong>{formatNumber(report.cupons.pedidos)}</strong>
            </div>
            <table className="report-print-table report-print-table-compact">
              <tbody>
                <tr>
                  <td>Pedidos com cupom</td>
                  <td>{formatNumber(report.cupons.pedidosComCupom)}</td>
                  <td>{formatNumber(report.cupons.sharePct, 1)}%</td>
                </tr>
                <tr>
                  <td>Total de descontos</td>
                  <td colSpan={2}>{formatCurrency(report.cupons.totalDesconto)}</td>
                </tr>
              </tbody>
            </table>
            {payments.length ? (
              <table className="report-print-table report-print-table-compact">
                <thead>
                  <tr>
                    <th>Forma</th>
                    <th>Faturamento</th>
                    <th>Pedidos</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((row) => (
                    <tr key={row.code}>
                      <td>{row.label}</td>
                      <td>{formatCurrency(row.faturamento)}</td>
                      <td>{formatNumber(row.pedidos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </section>
        </div>

        <footer className="report-print-footer">
          <span>Cardápio Digital Nimbus</span>
          <span>{generatedLabel}</span>
        </footer>
      </article>
    </div>
  );
}
