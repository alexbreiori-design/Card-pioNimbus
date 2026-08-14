'use client';

import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

export default function ReportsSparkline({ values = [], color = '#4e48dd' }) {
  const data = useMemo(
    () =>
      (Array.isArray(values) ? values : []).map((value, index) => ({
        i: index,
        v: Number(value) || 0,
      })),
    [values]
  );

  if (data.length < 2) {
    return <div className="admin-reports-sparkline is-empty" aria-hidden="true" />;
  }

  return (
    <div className="admin-reports-sparkline" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark-${color.replace('#', '')})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
