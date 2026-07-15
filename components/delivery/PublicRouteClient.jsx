'use client';

import { useCallback, useEffect, useState } from 'react';

function statusLabel(status) {
  if (status === 'concluido') return 'Entregue';
  if (status === 'saiu_entrega') return 'Em rota';
  if (status === 'em_preparo') return 'Em preparo';
  return 'Pendente';
}

export default function PublicRouteClient({ token }) {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/public-delivery-route/${encodeURIComponent(token)}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Não foi possível abrir a rota.');
      setRoute(json.route);
    } catch (err) {
      setError(err?.message || 'Erro ao carregar.');
      setRoute(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markDelivered({ pedidoId = null, all = false } = {}) {
    setActingId(all ? 'all' : pedidoId || '');
    setError('');
    try {
      const res = await fetch(`/api/public-delivery-route/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId, all }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Não foi possível marcar como entregue.');
      setRoute(json.route);
    } catch (err) {
      setError(err?.message || 'Erro ao atualizar.');
    } finally {
      setActingId('');
    }
  }

  if (loading) {
    return <p className="public-route-status">Carregando rota…</p>;
  }

  if (!route) {
    return (
      <div className="public-route-card">
        <h1>Rota indisponível</h1>
        <p>{error || 'Este link não é válido.'}</p>
      </div>
    );
  }

  return (
    <div className="public-route-shell">
      <header className="public-route-hero">
        <p className="public-route-eyebrow">{route.lojaNome}</p>
        <h1>{route.titulo}</h1>
        {route.entregadorNome ? <p className="public-route-driver">Entregador: {route.entregadorNome}</p> : null}
        {route.mapsUrl ? (
          <a className="public-route-maps" href={route.mapsUrl} target="_blank" rel="noopener noreferrer">
            Abrir no Google Maps
          </a>
        ) : null}
      </header>

      {error ? <p className="public-route-error">{error}</p> : null}

      {route.allDone ? (
        <div className="public-route-done">
          <strong>Todas as entregas desta rota foram marcadas.</strong>
          <span>Pode avisar a loja se precisar.</span>
        </div>
      ) : (
        <div className="public-route-actions-top">
          <button
            type="button"
            className="public-route-btn primary"
            disabled={Boolean(actingId)}
            onClick={() => void markDelivered({ all: true })}
          >
            {actingId === 'all' ? 'Marcando…' : 'Marcar todas como entregues'}
          </button>
        </div>
      )}

      <ul className="public-route-list">
        {(route.stops || []).map((stop) => (
          <li key={stop.pedidoId} className={`public-route-item${stop.entregue ? ' is-done' : ''}`}>
            <div>
              <strong>
                #{stop.codigo} · {stop.clienteNome}
              </strong>
              <span>{stop.enderecoTexto || 'Sem endereço'}</span>
              <em>{statusLabel(stop.status)}</em>
            </div>
            {stop.entregue ? (
              <span className="public-route-badge">Entregue</span>
            ) : (
              <button
                type="button"
                className="public-route-btn"
                disabled={Boolean(actingId)}
                onClick={() => void markDelivered({ pedidoId: stop.pedidoId })}
              >
                {actingId === stop.pedidoId ? '…' : 'Entregue'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
