'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/admin/reports/reportFormatters';
import ReportsSectionTitle from '@/components/admin/reports/ReportsSectionTitle';

function ChartTooltip({ active, payload, metric }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  const value = metric === 'pedidos' ? point.pedidos : point.faturamento;
  return (
    <div className="admin-reports-chart-tooltip">
      <strong>{point.label}</strong>
      <span>
        {metric === 'pedidos' ? `${formatNumber(value)} pedidos` : formatCurrency(value)}
      </span>
    </div>
  );
}

export default function ReportsPerformanceChart({ series = [] }) {
  const [metric, setMetric] = useState('faturamento');
  const data = useMemo(() => (Array.isArray(series) ? series : []), [series]);
  const dataKey = metric === 'pedidos' ? 'pedidos' : 'faturamento';

  return (
    <section className="admin-reports-card admin-reports-chart-card">
      <div className="admin-reports-chart-head">
        <ReportsSectionTitle
          icon="chart"
          subtitle={metric === 'pedidos' ? 'Pedidos por dia.' : 'Faturamento diário.'}
        >
          Desempenho no período
        </ReportsSectionTitle>
        <div className="admin-reports-metric-toggle" role="group" aria-label="Métrica do gráfico">
          <button
            type="button"
            className={metric === 'faturamento' ? 'is-active' : ''}
            onClick={() => setMetric('faturamento')}
          >
            Faturamento
          </button>
          <button
            type="button"
            className={metric === 'pedidos' ? 'is-active' : ''}
            onClick={() => setMetric('pedidos')}
          >
            Pedidos
          </button>
        </div>
      </div>

      <div className="admin-reports-chart-body">
        {data.length === 0 ? (
          <div className="admin-reports-empty">Sem dados no período.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="reportsAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4e48dd" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#4e48dd" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#eef1f6" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(value) =>
                  metric === 'pedidos'
                    ? formatNumber(value)
                    : `R$ ${formatNumber(value, value >= 100 ? 0 : 0)}`
                }
              />
              <Tooltip content={<ChartTooltip metric={metric} />} />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke="#4e48dd"
                strokeWidth={2.5}
                fill="url(#reportsAreaFill)"
                activeDot={{ r: 5, fill: '#4e48dd', stroke: '#fff', strokeWidth: 2 }}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
