'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import SuperAdminNavIcon from './SuperAdminNavIcon';
import { SaComercialSkeleton } from './SuperAdminSkeletons';

const POLL_MS = 15_000;

const STATUS_FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'active', label: 'Ativos' },
  { id: 'trialing', label: 'Trial' },
  { id: 'past_due', label: 'Em atraso' },
  { id: 'cortesia', label: 'Em carência' },
  { id: 'none', label: 'Sem assinatura' },
];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCurrencyCents(value) {
  if (value === null || value === undefined) return '—';
  return formatCurrency(Number(value) / 100);
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
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

function rowStatusId(store) {
  return store.assinatura?.statusLocal === 'cortesia' ? 'cortesia' : store.assinatura?.status || 'none';
}

function buildCsv(stores) {
  const header = ['Loja', 'Slug', 'Plano', 'Status', 'Valor', 'Período atual até', 'Suspensa'];
  const lines = stores.map((store) => [
    store.nome,
    store.slug,
    store.assinatura?.planoLabel || '—',
    store.assinatura?.display?.label || '—',
    formatCurrencyCents(store.assinatura?.valorCentavos),
    formatDate(store.assinatura?.currentPeriodEnd),
    store.suspensa ? 'Sim' : 'Não',
  ]);
  return [header, ...lines]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export default function ComercialPanel({ onOpenStore }) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [planFilter, setPlanFilter] = useState('todos');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const response = await fetch('/api/super-admin/billing');
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Não foi possível carregar o comercial.');
      }
      setPayload(data);
    } catch (loadError) {
      if (!silent) {
        setError(loadError?.message || 'Erro ao carregar.');
        setPayload(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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

  const stores = payload?.stores || [];
  const plans = payload?.plans || [];

  const filteredStores = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return stores.filter((store) => {
      if (statusFilter !== 'todos' && rowStatusId(store) !== statusFilter) return false;
      if (planFilter !== 'todos' && store.assinatura?.planoCodigo !== planFilter) return false;
      if (!needle) return true;
      return (
        String(store.nome || '').toLowerCase().includes(needle) ||
        String(store.slug || '').toLowerCase().includes(needle) ||
        String(store.assinatura?.planoLabel || '').toLowerCase().includes(needle)
      );
    });
  }, [stores, query, statusFilter, planFilter]);

  const csvContent = useMemo(() => buildCsv(filteredStores), [filteredStores]);

  return (
    <div className="admin-content admin-sistema-page">
      <AdminPageHeader title="Comercial" iconNode={<SuperAdminNavIcon name="comercial" />} />

      <p className="admin-sistema-intro admin-sistema-intro-tight">
        Assinaturas Nimbus das lojas clientes — planos Stripe, status, MRR e cobrança.
      </p>

      {error ? <p className="admin-sistema-error">{error}</p> : null}

      {payload?.stripeConfigured === false ? (
        <p className="admin-sistema-warning-banner">
          Stripe não configurado neste ambiente — checkout e portal ficarão indisponíveis até definir
          <code> STRIPE_SECRET_KEY</code>.
        </p>
      ) : null}

      {loading && !payload ? (
        <SaComercialSkeleton />
      ) : (
        <>
          {plans.length ? (
            <div className="admin-sistema-plan-catalog">
              {plans.map((plan) => (
                <article key={plan.codigo} className="admin-sistema-plan-catalog-card">
                  <span className="admin-sistema-kpi-label">{plan.label}</span>
                  <strong>{formatCurrencyCents(plan.valorCentavos)}/mês</strong>
                  <p>{plan.descricao}</p>
                </article>
              ))}
            </div>
          ) : null}

          {payload ? (
            <div className="admin-sistema-kpi-grid admin-sistema-kpi-grid-ops">
              <article className="admin-sistema-kpi-card is-featured">
                <span className="admin-sistema-kpi-label">MRR</span>
                <strong className="admin-sistema-kpi-value">
                  {formatCurrencyCents(payload.mrrCentavos)}
                </strong>
              </article>
              <article className="admin-sistema-kpi-card">
                <span className="admin-sistema-kpi-label">Ativos</span>
                <strong className="admin-sistema-kpi-value">{payload.counts?.active || 0}</strong>
              </article>
              <article className="admin-sistema-kpi-card">
                <span className="admin-sistema-kpi-label">Trial</span>
                <strong className="admin-sistema-kpi-value">{payload.counts?.trialing || 0}</strong>
              </article>
              <article className="admin-sistema-kpi-card is-warn">
                <span className="admin-sistema-kpi-label">Em atraso</span>
                <strong className="admin-sistema-kpi-value">
                  {(payload.counts?.past_due || 0) + (payload.counts?.unpaid || 0)}
                </strong>
              </article>
              <article className="admin-sistema-kpi-card">
                <span className="admin-sistema-kpi-label">Em carência</span>
                <strong className="admin-sistema-kpi-value">{payload.counts?.cortesia || 0}</strong>
              </article>
            </div>
          ) : null}

          <div className="admin-card admin-sistema-panel-card admin-sistema-panel-card-wide">
            <div className="admin-sistema-toolbar admin-sistema-reports-toolbar">
              <label className="admin-sistema-search-wrap">
                <input
                  type="search"
                  className="admin-sistema-search"
                  placeholder="Buscar loja, slug ou plano..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <div className="admin-sistema-filter-chips">
                {STATUS_FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`admin-sistema-filter-chip${statusFilter === item.id ? ' is-active' : ''}`}
                    onClick={() => setStatusFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {plans.length ? (
                <label className="admin-sistema-period-field">
                  <span className="admin-label">Plano</span>
                  <select
                    className="admin-input admin-sistema-period-select"
                    value={planFilter}
                    onChange={(event) => setPlanFilter(event.target.value)}
                  >
                    <option value="todos">Todos os planos</option>
                    {plans.map((plan) => (
                      <option key={plan.codigo} value={plan.codigo}>
                        {plan.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                disabled={!filteredStores.length}
                onClick={() => downloadCsv('comercial-nimbus.csv', csvContent)}
              >
                Exportar CSV
              </button>
            </div>

            {!filteredStores.length ? (
              <p className="admin-sistema-muted">Nenhuma loja encontrada neste filtro.</p>
            ) : (
              <div className="admin-sistema-ranking-table-wrap">
                <table className="admin-sistema-ranking-table">
                  <thead>
                    <tr>
                      <th>Loja</th>
                      <th>Plano</th>
                      <th>Status</th>
                      <th>Valor</th>
                      <th>Período atual até</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStores.map((store) => (
                      <tr key={store.slug}>
                        <td>
                          <button
                            type="button"
                            className="admin-sistema-ranking-store-btn"
                            onClick={() => onOpenStore?.(store.slug, 'comercial')}
                          >
                            {store.nome}
                            <span>/{store.slug}</span>
                          </button>
                        </td>
                        <td>{store.assinatura?.planoLabel || '—'}</td>
                        <td>
                          <span className={`admin-billing-status-pill is-${rowStatusId(store)}`}>
                            {store.assinatura?.display?.label || 'Sem assinatura'}
                          </span>
                          {store.suspensa ? (
                            <span className="admin-sistema-suspended-pill" style={{ marginLeft: 6 }}>
                              Suspensa
                            </span>
                          ) : null}
                        </td>
                        <td>{formatCurrencyCents(store.assinatura?.valorCentavos)}</td>
                        <td>{formatDate(store.assinatura?.currentPeriodEnd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
