'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { activityStatusLabel } from '@/lib/superAdmin/storeActivity';
import { getTimeGreeting } from '@/lib/greeting';

const POLL_MS = 15_000;

export default function InicioPanel({ onOpenStore, onGoToLojas }) {
  const [data, setData] = useState(null);
  const [profileName, setProfileName] = useState('Nimbus');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const response = await fetch('/api/super-admin/overview');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível carregar o início.');
      }
      setData(payload);
    } catch (loadError) {
      if (!silent) {
        setError(loadError?.message || 'Erro ao carregar.');
        setData(null);
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

  useEffect(() => {
    let cancelled = false;
    fetch('/api/super-admin/profile')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload?.profile?.nome_exibicao) {
          setProfileName(payload.profile.nome_exibicao);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = data?.counts;
  const greeting = useMemo(() => {
    const timeLabel = getTimeGreeting();
    const name = String(profileName || '').trim() || 'Nimbus';
    return `${timeLabel}, ${name}`;
  }, [profileName]);

  const heroLegend = useMemo(() => {
    if (!counts) return 'Carregando resumo operacional...';
    const parts = [
      `${counts.abertas ?? 0} aberta(s) agora`,
      `${counts.semPedidoRecente ?? 0} sem pedido recente`,
    ];
    if (typeof counts.suspensas === 'number' && counts.suspensas > 0) {
      parts.push(`${counts.suspensas} suspensa(s)`);
    }
    return parts.join(' · ');
  }, [counts]);

  return (
    <div className="admin-content admin-sistema-page admin-sistema-page-inicio">
      <header className="admin-sistema-hero">
        <div>
          <p className="admin-sistema-hero-kicker">Painel Nimbus</p>
          <h1 className="admin-sistema-hero-title">{greeting}</h1>
          <p className="admin-sistema-hero-lead">{heroLegend}</p>
        </div>
      </header>

      {error ? <p className="admin-sistema-error">{error}</p> : null}
      {loading && !counts ? <p className="admin-sistema-muted">Carregando...</p> : null}

      {counts ? (
        <div className="admin-sistema-kpi-grid admin-sistema-kpi-grid-ops admin-sistema-kpi-grid-hero">
          <article className="admin-sistema-kpi-card">
            <span className="admin-sistema-kpi-label">Lojas clientes</span>
            <strong className="admin-sistema-kpi-value">{counts.total}</strong>
          </article>
          <article className="admin-sistema-kpi-card">
            <span className="admin-sistema-kpi-label">Abertas agora</span>
            <strong className="admin-sistema-kpi-value">{counts.abertas}</strong>
          </article>
          <article className="admin-sistema-kpi-card">
            <span className="admin-sistema-kpi-label">Sem pedido recente</span>
            <strong className="admin-sistema-kpi-value">{counts.semPedidoRecente}</strong>
          </article>
          <article className="admin-sistema-kpi-card">
            <span className="admin-sistema-kpi-label">Criadas no mês</span>
            <strong className="admin-sistema-kpi-value">{counts.criadasNoMes}</strong>
          </article>
          {typeof counts.suspensas === 'number' ? (
            <article className="admin-sistema-kpi-card is-warn">
              <span className="admin-sistema-kpi-label">Suspensas</span>
              <strong className="admin-sistema-kpi-value">{counts.suspensas}</strong>
            </article>
          ) : null}
        </div>
      ) : null}

      {data ? (
        <div className="admin-sistema-inicio-grid">
          <section className="admin-card admin-sistema-panel-card">
            <h2 className="admin-sistema-section-title">Saúde da plataforma</h2>
            <p className={`admin-sistema-health-pill ${data.health?.ok ? 'ok' : 'bad'}`}>
              {data.health?.ok ? 'Supabase respondendo' : 'Verificar Supabase / deploy'}
            </p>
          </section>

          <section className="admin-card admin-sistema-panel-card">
            <div className="admin-sistema-section-head">
              <h2 className="admin-sistema-section-title">Precisa de atenção</h2>
              <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onGoToLojas}>
                Ver lojas
              </button>
            </div>
            {!data.alertas?.length ? (
              <p className="admin-sistema-muted">Nenhum alerta no momento.</p>
            ) : (
              <ul className="admin-sistema-alert-list">
                {data.alertas.map((item) => (
                  <li key={item.slug}>
                    <button
                      type="button"
                      className="admin-sistema-alert-btn"
                      onClick={() => onOpenStore?.(item.slug)}
                    >
                      <strong>{item.nome}</strong>
                      <span>{activityStatusLabel('sem_pedido_recente')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-card admin-sistema-panel-card">
            <h2 className="admin-sistema-section-title">Últimas lojas</h2>
            <ul className="admin-sistema-recent-list">
              {(data.recentes || []).map((item) => (
                <li key={item.slug}>
                  <button
                    type="button"
                    className="admin-sistema-recent-btn"
                    onClick={() => onOpenStore?.(item.slug)}
                  >
                    <strong>{item.nome}</strong>
                    <span>
                      {[item.cidade, new Date(item.created_at).toLocaleDateString('pt-BR')]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
