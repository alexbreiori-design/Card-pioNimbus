'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTimeGreeting } from '@/lib/greeting';
import { SaComandoSkeleton } from './SuperAdminSkeletons';

const POLL_MS = 15_000;

const ALERT_TAB = {
  suspensa: 'operacao',
  past_due: 'comercial',
  carencia_vencendo: 'comercial',
  sem_go_live: 'comercial',
  feedback: 'pessoas',
  sem_pedido_recente: 'visao',
};

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCurrencyCents(value) {
  return formatCurrency(Number(value || 0) / 100);
}

export default function ComandoPanel({ onOpenStore, onGoToLojas }) {
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
        throw new Error(payload.error || 'Não foi possível carregar o comando.');
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
  const billing = data?.billing;
  const greeting = useMemo(() => {
    const timeLabel = getTimeGreeting();
    const name = String(profileName || '').trim() || 'Nimbus';
    return `${timeLabel}, ${name}`;
  }, [profileName]);

  function openAlert(alert) {
    const tab = ALERT_TAB[alert.tipo] || null;
    onOpenStore?.(alert.slug, tab);
  }

  return (
    <div className="admin-content admin-sistema-page admin-sistema-page-inicio">
      <header className="admin-sistema-hero admin-comando-hero">
        <div>
          <p className="admin-sistema-hero-kicker">{greeting}</p>
          <h1 className="admin-sistema-hero-title">Comando</h1>
          <p className="admin-sistema-hero-lead">
            Visão consolidada da operação Nimbus — lojas, cobrança e mensagens em um só lugar.
          </p>
        </div>
      </header>

      {error ? <p className="admin-sistema-error">{error}</p> : null}
      {loading && !counts ? <SaComandoSkeleton /> : null}

      {counts ? (
        <div className="admin-sistema-kpi-grid admin-comando-pulse-grid">
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
          {typeof counts.suspensas === 'number' ? (
            <article className="admin-sistema-kpi-card is-warn">
              <span className="admin-sistema-kpi-label">Suspensas</span>
              <strong className="admin-sistema-kpi-value">{counts.suspensas}</strong>
            </article>
          ) : null}
          <article className="admin-sistema-kpi-card is-warn">
            <span className="admin-sistema-kpi-label">Em atraso</span>
            <strong className="admin-sistema-kpi-value">{billing?.pastDue || 0}</strong>
          </article>
          <article className="admin-sistema-kpi-card">
            <span className="admin-sistema-kpi-label">Em trial</span>
            <strong className="admin-sistema-kpi-value">{billing?.trials || 0}</strong>
          </article>
          <article className="admin-sistema-kpi-card">
            <span className="admin-sistema-kpi-label">Inbox aberto</span>
            <strong className="admin-sistema-kpi-value">{data?.feedbackAbertos || 0}</strong>
          </article>
          <article className="admin-sistema-kpi-card is-featured">
            <span className="admin-sistema-kpi-label">MRR</span>
            <strong className="admin-sistema-kpi-value">{formatCurrencyCents(billing?.mrrCentavos)}</strong>
          </article>
        </div>
      ) : null}

      {data ? (
        <div className="admin-sistema-inicio-grid">
          <section className="admin-card admin-sistema-panel-card admin-comando-attention-card">
            <div className="admin-sistema-section-head">
              <h2 className="admin-sistema-section-title">Precisa de você</h2>
              <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onGoToLojas}>
                Ver lojas
              </button>
            </div>
            {!data.alertas?.length ? (
              <p className="admin-sistema-muted">Nenhum alerta no momento — tudo em dia.</p>
            ) : (
              <ul className="admin-sistema-alert-list">
                {data.alertas.map((item, index) => (
                  <li key={`${item.slug}-${item.tipo}-${index}`}>
                    <button
                      type="button"
                      className={`admin-sistema-alert-btn admin-comando-alert-btn is-${item.tipo}`}
                      onClick={() => openAlert(item)}
                    >
                      <strong>{item.nome}</strong>
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-card admin-sistema-panel-card">
            <h2 className="admin-sistema-section-title">Saúde da plataforma</h2>
            <p className={`admin-sistema-health-pill ${data.health?.ok ? 'ok' : 'bad'}`}>
              {data.health?.ok ? 'Supabase respondendo' : 'Verificar Supabase / deploy'}
            </p>

            <h3 className="admin-sistema-section-subtitle">Últimas lojas</h3>
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
