'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useAdminToast } from '@/context/AdminToastContext';
import SuperAdminNavIcon from './SuperAdminNavIcon';
import { SaInboxSkeleton } from './SuperAdminSkeletons';

const POLL_MS = 15_000;

const STATUS_FILTERS = [
  { id: 'aberto', label: 'Abertos' },
  { id: 'lido', label: 'Lidos' },
  { id: 'arquivado', label: 'Arquivados' },
  { id: 'todos', label: 'Todos' },
];

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return '—';
  }
}

export default function InboxPanel({ onOpenStore }) {
  const toast = useAdminToast();
  const [items, setItems] = useState([]);
  const [abertos, setAbertos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('aberto');
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const response = await fetch('/api/super-admin/feedback');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível carregar o inbox.');
      }
      setItems(payload.items || []);
      setAbertos(Number(payload.abertos || 0));
    } catch (loadError) {
      if (!silent) {
        setError(loadError?.message || 'Erro ao carregar.');
        setItems([]);
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

  const filteredItems = useMemo(() => {
    if (filter === 'todos') return items;
    return items.filter((item) => item.status === filter);
  }, [items, filter]);

  async function updateStatus(item, status) {
    if (!item?.slug || !item?.id) return;
    setSavingId(item.id);
    try {
      const response = await fetch(`/api/super-admin/stores/${encodeURIComponent(item.slug)}/feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível atualizar.');
      }
      setItems((prev) => {
        const next = prev.map((row) => (row.id === item.id ? { ...row, ...payload.feedback } : row));
        setAbertos(next.filter((row) => row.status === 'aberto').length);
        return next;
      });
    } catch (updateError) {
      toast.error(updateError?.message || 'Erro ao atualizar feedback.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="admin-content admin-sistema-page">
      <AdminPageHeader title="Inbox" iconNode={<SuperAdminNavIcon name="inbox" />} />

      <p className="admin-sistema-intro admin-sistema-intro-tight">
        Mensagens enviadas pelos lojistas em “Fale conosco” — {abertos} aberta(s) no momento.
      </p>

      {error ? <p className="admin-sistema-error">{error}</p> : null}

      <div className="admin-card admin-sistema-panel-card admin-sistema-panel-card-wide">
        <div className="admin-sistema-toolbar">
          <div className="admin-sistema-filter-chips">
            {STATUS_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`admin-sistema-filter-chip${filter === item.id ? ' is-active' : ''}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                {item.id === 'aberto' && abertos > 0 ? ` (${abertos})` : ''}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            onClick={() => load()}
            disabled={loading}
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        {loading && !filteredItems.length ? <SaInboxSkeleton /> : null}

        {!loading && !filteredItems.length ? (
          <p className="admin-sistema-muted">Nenhuma mensagem neste filtro.</p>
        ) : null}

        {!loading || filteredItems.length ? (
        <div className="admin-inbox-list">
          {filteredItems.map((item) => (
            <article key={item.id} className="admin-inbox-card">
              <header className="admin-inbox-card-head">
                <button
                  type="button"
                  className="admin-inbox-store-btn"
                  onClick={() => onOpenStore?.(item.slug, 'pessoas')}
                >
                  {item.lojaNome || item.slug || 'Loja'}
                  <span>/{item.slug}</span>
                </button>
                <span className={`admin-billing-status-pill is-${item.status}`}>{item.statusLabel}</span>
              </header>
              <p className="admin-inbox-meta">
                <strong>{item.categoriaLabel}</strong>
                {' · '}
                {item.autorNome || item.autorEmail || 'Lojista'}
                {' · '}
                {formatDate(item.createdAt)}
              </p>
              <p className="admin-inbox-message">{item.mensagem}</p>
              <div className="admin-inbox-actions">
                {item.status !== 'lido' ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost admin-btn-sm"
                    disabled={savingId === item.id}
                    onClick={() => updateStatus(item, 'lido')}
                  >
                    Marcar lido
                  </button>
                ) : null}
                {item.status !== 'arquivado' ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost admin-btn-sm"
                    disabled={savingId === item.id}
                    onClick={() => updateStatus(item, 'arquivado')}
                  >
                    Arquivar
                  </button>
                ) : null}
                {item.status !== 'aberto' ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost admin-btn-sm"
                    disabled={savingId === item.id}
                    onClick={() => updateStatus(item, 'aberto')}
                  >
                    Reabrir
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        ) : null}
      </div>
    </div>
  );
}
