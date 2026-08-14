'use client';

import { formatCurrency, formatNumber, formatPct } from '@/lib/admin/reports/reportFormatters';
import ReportsSparkline from '@/components/admin/reports/ReportsSparkline';

function TrendBadge({ kpi }) {
  if (!kpi) return null;
  return (
    <span className={`admin-reports-kpi-trend ${kpi.positive ? 'positive' : 'negative'}`}>
      {kpi.positive ? '↑' : '↓'} {formatPct(kpi.changePct)}
    </span>
  );
}

const KPI_ITEMS = [
  { key: 'faturamento', label: 'Faturamento', format: 'currency' },
  { key: 'pedidos', label: 'Pedidos', format: 'number' },
  { key: 'ticketMedio', label: 'Ticket médio', format: 'currency' },
];

export default function ReportsKpiRow({ kpis, sparklines }) {
  return (
    <section className="admin-reports-kpi-grid">
      {KPI_ITEMS.map((item) => {
        const kpi = kpis?.[item.key];
        const value = kpi?.value;
        const display =
          item.format === 'currency' ? formatCurrency(value) : formatNumber(value, 0);
        return (
          <article key={item.key} className="admin-reports-kpi">
            <div className="admin-reports-kpi-copy">
              <p className="admin-reports-kpi-label">{item.label}</p>
              <p className="admin-reports-kpi-value">{display}</p>
              <TrendBadge kpi={kpi} />
            </div>
            <ReportsSparkline values={sparklines?.[item.key] || []} />
          </article>
        );
      })}
    </section>
  );
}
