'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { rankingToCsv } from '@/lib/superAdmin/metricsCompare';

const POLL_MS = 15_000;

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function RelatoriosPanel({ onOpenStore }) {
  const [days, setDays] = useState(30);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const response = await fetch(`/api/super-admin/rankings?days=${days}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível carregar o ranking.');
      }
      setRanking(payload.ranking || []);
    } catch (loadError) {
      if (!silent) {
        setError(loadError?.message || 'Erro ao carregar.');
        setRanking([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load({ silent: true }), POLL_MS);
    const onFocus = () => load({ silent: true });
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  const csvContent = useMemo(() => rankingToCsv(ranking), [ranking]);

  const periodLabel =
    days === 30 ? 'últimos 30 dias' : days === 90 ? 'últimos 90 dias' : 'últimos 6 meses';

  const summaryLegend = useMemo(() => {
    if (!ranking.length) return `Nenhuma venda pelo cardápio online no período (${periodLabel}).`;
    const totalPedidos = ranking.reduce((sum, row) => sum + (row.pedidos || 0), 0);
    const totalFaturamento = ranking.reduce((sum, row) => sum + Number(row.faturamento || 0), 0);
    return `${ranking.length} loja(s) no ranking · ${totalPedidos} pedido(s) · ${formatCurrency(totalFaturamento)} no período (${periodLabel})`;
  }, [ranking, periodLabel]);

  return (
    <div className="admin-content admin-sistema-page">
      <AdminPageHeader title="Relatórios" icon="category" />

      <p className="admin-sistema-intro admin-sistema-intro-tight">{summaryLegend}</p>

      <div className="admin-card admin-sistema-panel-card admin-sistema-panel-card-wide">
        <div className="admin-sistema-toolbar admin-sistema-reports-toolbar">
          <label className="admin-sistema-period-field">
            <span className="admin-label">Período</span>
            <select
              className="admin-input admin-sistema-period-select"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
              <option value={180}>Últimos 6 meses</option>
            </select>
          </label>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={!ranking.length}
            onClick={() => downloadCsv(`ranking-nimbus-${days}d.csv`, csvContent)}
          >
            Exportar CSV
          </button>
        </div>

        {error ? <p className="admin-sistema-error">{error}</p> : null}
        {loading ? <p className="admin-sistema-muted">Carregando ranking...</p> : null}

        {!loading && !ranking.length ? (
          <p className="admin-sistema-muted">Nenhuma loja cliente com pedidos no período.</p>
        ) : null}

        {!loading && ranking.length ? (
          <div className="admin-sistema-ranking-table-wrap">
            <table className="admin-sistema-ranking-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Loja</th>
                  <th>Cidade</th>
                  <th>Pedidos</th>
                  <th>Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((row) => (
                  <tr key={row.slug}>
                    <td>{row.rank}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-sistema-ranking-store-btn"
                        onClick={() => onOpenStore?.(row.slug)}
                      >
                        {row.nome}
                        <span>/{row.slug}</span>
                      </button>
                    </td>
                    <td>{row.cidade || '—'}</td>
                    <td>{row.pedidos}</td>
                    <td>{formatCurrency(row.faturamento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
