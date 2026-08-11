'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminAvailabilitySwitch from '@/components/admin/AdminAvailabilitySwitch';
import { AdminListSkeleton } from '@/components/admin/AdminSkeleton';
import DeliveryZoneModal from '@/components/admin/delivery/DeliveryZoneModal';
import { useAdminToast } from '@/context/AdminToastContext';
import {
  listAreasExclusaoByEmpresaId,
  syncAreasExclusao,
} from '@/lib/supabase/areasExclusao';
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

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function emptyDraft() {
  return { nome: '', raio_km: '3', taxa_entrega: '' };
}

export default function DeliveryZonesCrud({
  empresaId,
  storeLat = null,
  storeLng = null,
  storeLabel = 'Loja',
}) {
  const [areas, setAreas] = useState([]);
  const [exclusions, setExclusions] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useAdminToast();
  const [draft, setDraft] = useState(emptyDraft());
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!empresaId) {
      setAreas([]);
      setExclusions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [zoneRows, exclusionRows] = await Promise.all([
        listZonasByEmpresaId(empresaId),
        listAreasExclusaoByEmpresaId(empresaId).catch(() => []),
      ]);
      setAreas(zoneRows);
      setExclusions(exclusionRows);
    } catch (e) {
      toast.error(e?.message || 'Erro ao carregar áreas.');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    load();
  }, [load]);

  function resetModal() {
    setDraft(emptyDraft());
    setEditingId(null);
    setModalOpen(false);
    setSaving(false);
  }

  function openNewForm() {
    setDraft(emptyDraft());
    setEditingId(null);
    setModalOpen(true);
  }

  function startEdit(area) {
    setEditingId(area.id);
    setDraft({
      nome: area.nome,
      raio_km: String(area.raio_km ?? ''),
      taxa_entrega: moneyToInput(area.taxa_entrega),
    });
    setModalOpen(true);
  }

  async function handleSave(payload) {
    if (!empresaId) return;
    setSaving(true);
    try {
      const { exclusoes = [], ...zonePayload } = payload;
      if (editingId) {
        const current = areas.find((a) => a.id === editingId);
        await updateZona(editingId, {
          ...zonePayload,
          ativo: current?.ativo !== false,
          ordem: current?.ordem ?? 0,
        });
      } else {
        await createZona(empresaId, {
          ...zonePayload,
          ativo: true,
          ordem: areas.length,
        });
      }

      const previousIds = exclusions.map((item) => item.id).filter(Boolean);
      const savedExclusions = await syncAreasExclusao(empresaId, exclusoes, previousIds);
      setExclusions(savedExclusions);

      resetModal();
      await load();
      toast.success(editingId ? 'Área atualizada.' : 'Área cadastrada.');
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar área.');
      setSaving(false);
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
      if (editingId === id) resetModal();
      await load();
    } catch (e) {
      toast.error(e?.message || 'Erro ao remover área.');
    }
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
          Cadastre áreas com raio em km e taxa. Use exclusões no mapa para bloquear regiões mesmo
          dentro do raio.
        </p>
        <button type="button" className="admin-btn admin-btn-primary" onClick={openNewForm}>
          + Nova área
        </button>
      </div>

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

      <DeliveryZoneModal
        open={modalOpen}
        onClose={resetModal}
        onSave={handleSave}
        initialDraft={draft}
        initialExclusions={exclusions}
        editing={Boolean(editingId)}
        storeLat={storeLat}
        storeLng={storeLng}
        storeLabel={storeLabel}
        saving={saving}
      />
    </div>
  );
}
