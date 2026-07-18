'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import { AdminListSkeleton } from '@/components/admin/AdminSkeleton';
import { buildRouteShareMessage } from '@/lib/delivery/routeShareMessage';

function formatWhen(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function stopStatusLabel(stop) {
  if (stop.entregue || stop.status === 'concluido') return 'Entregue';
  if (stop.status === 'saiu_entrega') return 'A caminho';
  if (stop.status === 'em_preparo') return 'Preparo';
  return 'Pendente';
}

function RouteStopsModal({ rota, onClose }) {
  const { overlayPointerDown, overlayClick } = useAdminOverlayClose({
    onClose,
    isDirty: false,
  });
  if (!rota) return null;

  const stops = Array.isArray(rota.stops) ? rota.stops : [];

  return (
    <div
      className="admin-confirm-overlay"
      role="presentation"
      onPointerDown={overlayPointerDown}
      onClick={overlayClick}
    >
      <div
        className="admin-order-detail-modal admin-delivery-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-history-route-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-order-detail-head">
          <div>
            <span className="admin-order-detail-kicker">
              {rota.entregadorNome || 'Sem entregador'} ·{' '}
              {rota.status === 'ativa' ? 'Ativa' : 'Concluída'}
            </span>
            <h2 id="delivery-history-route-title">{rota.titulo}</h2>
            <p className="admin-help-text" style={{ margin: '6px 0 0' }}>
              {stops.length} entrega{stops.length === 1 ? '' : 's'} nesta rota ·{' '}
              {formatWhen(rota.createdAt)}
            </p>
          </div>
          <button type="button" className="admin-order-detail-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="admin-delivery-history-modal-body">
          {stops.length === 0 ? (
            <p className="admin-help-text">Nenhum pedido registrado nesta rota.</p>
          ) : (
            <ul className="admin-delivery-history-modal-stops">
              {stops.map((stop, index) => (
                <li key={stop.pedidoId || index}>
                  <div>
                    <strong>
                      #{stop.codigo} · {stop.clienteNome}
                    </strong>
                    {stop.clienteTelefone ? <span>{stop.clienteTelefone}</span> : null}
                    <span>{stop.enderecoTexto || 'Sem endereço'}</span>
                  </div>
                  <em>{stopStatusLabel(stop)}</em>
                </li>
              ))}
            </ul>
          )}
        </div>

        {rota.mapsUrl ? (
          <div className="admin-delivery-history-modal-footer">
            <a
              className="admin-link-btn"
              href={rota.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir no Google Maps
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function EntregadorHistoricoPanel({ empresaId }) {
  const { data } = useAdminData();
  const slug = (data?.loja?.slug || '').toLowerCase();
  const toast = useAdminToast();
  const [loading, setLoading] = useState(true);
  const [entregadores, setEntregadores] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [entregadorId, setEntregadorId] = useState('');
  const [detailRota, setDetailRota] = useState(null);

  const load = useCallback(async () => {
    if (!slug || !empresaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        slug,
        history: '1',
      });
      if (entregadorId) params.set('entregadorId', entregadorId);
      const res = await fetch(`/api/admin/delivery-routes?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Erro ao carregar histórico.');
      setEntregadores(json.entregadores || []);
      setHistorico(json.historico || []);
    } catch (error) {
      toast.error(error?.message || 'Erro ao carregar histórico.');
    } finally {
      setLoading(false);
    }
  }, [slug, empresaId, entregadorId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!empresaId) {
    return <p className="admin-help-text">Vínculo da empresa necessário para o histórico.</p>;
  }

  return (
    <div className="admin-delivery-history">
      <div className="admin-delivery-history-toolbar">
        <select
          className="admin-input admin-delivery-history-filter"
          value={entregadorId}
          onChange={(e) => setEntregadorId(e.target.value)}
          aria-label="Filtrar por entregador"
        >
          <option value="">Todos os entregadores</option>
          {entregadores.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
              {item.ativo === false ? ' (inativo)' : ''}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <AdminListSkeleton rows={4} />
      ) : historico.length === 0 ? (
        <p className="admin-help-text admin-delivery-areas-empty">Nenhuma rota encontrada.</p>
      ) : (
        <div className="admin-delivery-history-list" role="list">
          {historico.map((rota) => (
            <div key={rota.id} className="admin-delivery-history-row" role="listitem">
              <div className="admin-delivery-history-row-main">
                <span className="admin-delivery-history-row-title">
                  {rota.entregadorNome || 'Sem entregador'}
                  <span aria-hidden="true"> · </span>
                  {rota.titulo}
                </span>
                <span className="admin-delivery-history-row-meta">
                  {rota.pedidoCount} ped.
                  <span aria-hidden="true"> · </span>
                  {rota.status === 'ativa' ? 'Ativa' : 'Concluída'}
                  <span aria-hidden="true"> · </span>
                  {formatWhen(rota.createdAt)}
                </span>
              </div>
              <div className="admin-delivery-history-row-actions">
                <button
                  type="button"
                  className="admin-link-btn"
                  onClick={() => setDetailRota(rota)}
                >
                  Ver entregas
                </button>
                {rota.driverUrl && rota.status === 'ativa' ? (
                  <button
                    type="button"
                    className="admin-link-btn"
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        buildRouteShareMessage(
                          rota.titulo,
                          rota.mapsUrl,
                          rota.entregadorNome,
                          rota.driverUrl
                        )
                      );
                      toast.success('Link do entregador copiado.');
                    }}
                  >
                    Link
                  </button>
                ) : null}
                {rota.mapsUrl ? (
                  <a
                    className="admin-link-btn"
                    href={rota.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Maps
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <RouteStopsModal rota={detailRota} onClose={() => setDetailRota(null)} />
    </div>
  );
}
