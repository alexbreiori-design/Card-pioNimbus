'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminData } from '@/hooks/useAdminData';
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

export default function EntregadorHistoricoPanel({ empresaId }) {
  const { data } = useAdminData();
  const slug = (data?.loja?.slug || '').toLowerCase();
  const toast = useAdminToast();
  const [loading, setLoading] = useState(true);
  const [entregadores, setEntregadores] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [entregadorId, setEntregadorId] = useState('');

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
      <div className="admin-delivery-areas-toolbar">
        <p className="admin-help-text admin-delivery-areas-hint">
          Consulte rotas ativas e concluídas por entregador. Útil para acidentes, atrasos e auditoria.
        </p>
        <select
          className="admin-input admin-delivery-history-filter"
          value={entregadorId}
          onChange={(e) => setEntregadorId(e.target.value)}
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
        <p className="admin-help-text">Carregando histórico…</p>
      ) : historico.length === 0 ? (
        <p className="admin-help-text admin-delivery-areas-empty">Nenhuma rota encontrada.</p>
      ) : (
        <div className="admin-sparse-list">
          {historico.map((rota) => (
            <div key={rota.id} className="admin-sparse-row admin-crud-list-row">
              <div className="admin-sparse-row-main admin-sparse-row-main-stack">
                <span className="admin-sparse-row-code">
                  {rota.entregadorNome || 'Sem entregador'} · {rota.titulo}
                </span>
                <span className="admin-sparse-row-detail">
                  {rota.pedidoCount} pedido{rota.pedidoCount === 1 ? '' : 's'} ·{' '}
                  {rota.status === 'ativa' ? 'Ativa' : 'Concluída'} · {formatWhen(rota.createdAt)}
                </span>
              </div>
              <div className="admin-sparse-row-actions admin-item-actions-col">
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
                    Copiar link
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
    </div>
  );
}
