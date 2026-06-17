'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/admin/reports/reportFormatters';
import { useAdminData } from '@/hooks/useAdminData';

function formatDateBr(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function formatTimeBr(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function CaixaHistoricoPanel() {
  const { activeSlug } = useAdminData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    if (!activeSlug) return undefined;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/admin/caixa/historico?slug=${encodeURIComponent(activeSlug)}&days=30`);
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || 'Erro ao carregar histórico.');
        if (!cancelled) setHistorico(data.historico || []);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Erro ao carregar histórico.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeSlug]);

  const rows = historico.flatMap((day) =>
    day.turnos.map((turno) => ({
      dayKey: day.date,
      dayLabel: formatDateBr(`${day.date}T12:00:00`),
      turno,
    }))
  );

  return (
    <article className="admin-reports-card admin-caixa-historico-card">
      <h3 className="admin-reports-widget-title is-brand">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
        </svg>
        Histórico de caixa
      </h3>
      <p className="admin-reports-widget-subtitle">Turnos dos últimos 30 dias</p>

      {loading ? <p className="admin-caixa-historico-empty">Carregando histórico…</p> : null}
      {error ? (
        <p className="admin-caixa-historico-error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && !rows.length ? (
        <p className="admin-caixa-historico-empty">Nenhum turno registrado no período.</p>
      ) : null}

      {!loading && !error && rows.length ? (
        <div className="admin-caixa-historico-table-wrap">
          <table className="admin-caixa-historico-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Turno</th>
                <th>Período</th>
                <th>Vendas</th>
                <th>Pedidos</th>
                <th>Diferença</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ dayKey, dayLabel, turno }) => (
                <tr key={turno.id}>
                  <td data-label="Data">{dayLabel}</td>
                  <td data-label="Turno">#{turno.numeroTurno}</td>
                  <td data-label="Período">
                    {formatTimeBr(turno.abertoEm)}
                    {turno.fechadoEm ? ` – ${formatTimeBr(turno.fechadoEm)}` : ' – aberto'}
                  </td>
                  <td data-label="Vendas">{formatCurrency(turno.totalVendas)}</td>
                  <td data-label="Pedidos">{turno.totalPedidos}</td>
                  <td
                    data-label="Diferença"
                    className={
                      turno.status === 'fechado' && turno.diferencaDinheiro < 0
                        ? 'is-negative'
                        : turno.status === 'fechado' && turno.diferencaDinheiro > 0
                          ? 'is-positive'
                          : ''
                    }
                  >
                    {turno.status === 'fechado' ? formatCurrency(turno.diferencaDinheiro || 0) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </article>
  );
}
