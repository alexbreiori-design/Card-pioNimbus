'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminAvailabilitySwitch from '@/components/admin/AdminAvailabilitySwitch';
import { AdminListSkeleton } from '@/components/admin/AdminSkeleton';
import { useAdminToast } from '@/context/AdminToastContext';
import {
  createZona,
  deleteZona,
  listZonasByEmpresaId,
  updateZona,
} from '@/lib/supabase/zonasEntrega';

function moneyToInput(value) {
  if (value === undefined || value === null || value === '') return '';
  return String(value).replace('.', ',');
}

function inputToMoney(value) {
  const parsed = Number(
    String(value || '')
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function inputToRaio(value) {
  const parsed = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function emptyDraft() {
  return { nome: '', raio_km: '', taxa_entrega: '' };
}

export default function DeliveryZonesCrud({ empresaId }) {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useAdminToast();
  const [draft, setDraft] = useState(emptyDraft());
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    if (!empresaId) {
      setAreas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await listZonasByEmpresaId(empresaId);
      setAreas(rows);
    } catch (e) {
      toast.error(e?.message || 'Erro ao carregar áreas.');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setDraft(emptyDraft());
    setEditingId(null);
    setFormOpen(false);
  }

  function openNewForm() {
    setDraft(emptyDraft());
    setEditingId(null);
    setFormOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!empresaId) return;
    const payload = {
      nome: draft.nome.trim(),
      raio_km: inputToRaio(draft.raio_km),
      taxa_entrega: inputToMoney(draft.taxa_entrega),
      ativo: true,
      ordem: areas.length,
    };
    if (!payload.nome || payload.raio_km <= 0) {
      toast.error('Informe nome e raio (km) válidos.');
      return;
    }
    try {
      if (editingId) {
        const current = areas.find((a) => a.id === editingId);
        await updateZona(editingId, {
          ...payload,
          ativo: current?.ativo !== false,
          ordem: current?.ordem ?? 0,
        });
      } else {
        await createZona(empresaId, payload);
      }
      resetForm();
      await load();
      toast.success(editingId ? 'Área atualizada.' : 'Área cadastrada.');
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar área.');
    }
  }

  async function handleToggle(area) {
    try {
      await updateZona(area.id, { ...area, ativo: !area.ativo });
      await load();
    } catch (e) {
      toast.error(e?.message || 'Erro ao atualizar disponibilidade.');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover esta área de entrega?')) return;
    try {
      await deleteZona(id);
      if (editingId === id) resetForm();
      await load();
    } catch (e) {
      toast.error(e?.message || 'Erro ao remover área.');
    }
  }

  function startEdit(area) {
    setEditingId(area.id);
    setDraft({
      nome: area.nome,
      raio_km: String(area.raio_km ?? ''),
      taxa_entrega: moneyToInput(area.taxa_entrega),
    });
    setFormOpen(true);
  }

  if (!empresaId) {
    return (
      <p className="admin-help-text">
        Configure o slug da loja em Minha loja e vincule a empresa no Supabase para gerenciar áreas.
      </p>
    );
  }

  return (
    <div className="admin-delivery-areas">
      <div className="admin-delivery-areas-toolbar">
        <p className="admin-help-text admin-delivery-areas-hint">
          Cadastre áreas com raio em km e taxa. O sistema usa a menor área que cobrir a distância do cliente.
        </p>
        <button type="button" className="admin-btn admin-btn-primary" onClick={openNewForm}>
          + Nova área
        </button>
      </div>

      {formOpen ? (
        <form className="admin-delivery-area-form admin-card" onSubmit={handleSave}>
          <h3 className="admin-delivery-area-form-title">
            {editingId ? 'Editar área' : 'Nova área de entrega'}
          </h3>
          <div className="admin-delivery-zone-form-grid">
            <div className="admin-form-group">
              <label className="admin-label">Nome da área</label>
              <input
                className="admin-input"
                value={draft.nome}
                onChange={(e) => setDraft((d) => ({ ...d, nome: e.target.value }))}
                placeholder="Ex: Centro"
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Raio máximo (km)</label>
              <input
                className="admin-input"
                value={draft.raio_km}
                onChange={(e) => setDraft((d) => ({ ...d, raio_km: e.target.value }))}
                placeholder="3"
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Taxa de entrega</label>
              <input
                className="admin-input"
                value={draft.taxa_entrega}
                onChange={(e) => setDraft((d) => ({ ...d, taxa_entrega: e.target.value }))}
                placeholder="R$ 4,25"
              />
            </div>
          </div>
          <div className="admin-delivery-area-form-actions">
            <button type="button" className="admin-btn" onClick={resetForm}>
              Cancelar
            </button>
            <button type="submit" className="admin-btn admin-btn-primary">
              {editingId ? 'Salvar alterações' : 'Cadastrar área'}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <AdminListSkeleton rows={3} />
      ) : areas.length === 0 ? (
        <p className="admin-help-text admin-delivery-areas-empty">Nenhuma área cadastrada.</p>
      ) : (
        <div className="admin-sparse-list">
          {areas.map((area) => (
            <div key={area.id} className="admin-sparse-row admin-crud-list-row">
              <div className="admin-sparse-row-main admin-sparse-row-main-stack">
                <span className="admin-sparse-row-code">{area.nome}</span>
                <span className="admin-sparse-row-detail">
                  Raio {Number(area.raio_km)} km · Taxa {formatCurrency(area.taxa_entrega)}
                </span>
              </div>
              <div className="admin-sparse-row-actions admin-item-actions-col">
                <div className="admin-availability-cell">
                  <span>Disponível</span>
                  <AdminAvailabilitySwitch
                    checked={area.ativo !== false}
                    label={`Alterar disponibilidade de ${area.nome}`}
                    onChange={() => handleToggle(area)}
                  />
                </div>
                <button type="button" className="admin-link-btn" onClick={() => startEdit(area)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="admin-link-btn admin-link-btn-danger"
                  onClick={() => handleDelete(area.id)}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
