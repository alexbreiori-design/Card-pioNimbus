'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import AdminAvailabilitySwitch from '@/components/admin/AdminAvailabilitySwitch';
import { AdminListSkeleton } from '@/components/admin/AdminSkeleton';

const DeliveryZoneModal = dynamic(
  () => import('@/components/admin/delivery/DeliveryZoneModal'),
  { ssr: false }
);
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminMobileAccess } from '@/hooks/useAdminMobileAccess';
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

const RAIO_MIN = 0.5;
const RAIO_MAX = 40;

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

function parseRaio(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
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
  const [formError, setFormError] = useState('');
  const isMobile = useAdminMobileAccess();

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
  }, [empresaId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setDraft(emptyDraft());
    setEditingId(null);
    setModalOpen(false);
    setSaving(false);
    setFormError('');
  }

  function openNewForm() {
    setDraft(emptyDraft());
    setEditingId(null);
    setFormError('');
    setModalOpen(true);
  }

  function startEdit(area) {
    setEditingId(area.id);
    setDraft({
      nome: area.nome,
      raio_km: String(area.raio_km ?? '').replace('.', ','),
      taxa_entrega: moneyToInput(area.taxa_entrega),
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave(payload) {
    if (!empresaId) return;
    setSaving(true);
    try {
      const { exclusoes, ...zonePayload } = payload;
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

      // Só sincroniza exclusões quando o modal com mapa envia a lista.
      // No formulário simples do celular preservamos as exclusões já cadastradas.
      if (Array.isArray(exclusoes)) {
        const previousIds = exclusions.map((item) => item.id).filter(Boolean);
        const savedExclusions = await syncAreasExclusao(empresaId, exclusoes, previousIds);
        setExclusions(savedExclusions);
      }

      resetForm();
      await load();
      toast.success(editingId ? 'Área atualizada.' : 'Área cadastrada.');
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar área.');
      setSaving(false);
    }
  }

  async function handleSimpleSubmit(event) {
    event.preventDefault();
    const nomeTrim = draft.nome.trim();
    const raio = parseRaio(draft.raio_km);
    if (!nomeTrim) {
      setFormError('Informe o nome da área.');
      return;
    }
    if (raio < RAIO_MIN || raio > RAIO_MAX) {
      setFormError(`Informe um raio entre ${RAIO_MIN} e ${RAIO_MAX} km.`);
      return;
    }
    setFormError('');
    await handleSave({
      nome: nomeTrim,
      raio_km: raio,
      taxa_entrega: inputToMoney(draft.taxa_entrega),
    });
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
      toast.success('Área removida.');
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
          {isMobile
            ? 'Cadastre áreas com nome, raio e taxa. Exclusões no mapa ficam no computador.'
            : 'Cadastre áreas com raio em km e taxa. Use exclusões no mapa para bloquear regiões mesmo dentro do raio.'}
        </p>
        <button type="button" className="admin-btn admin-btn-primary" onClick={openNewForm}>
          + Nova área
        </button>
      </div>

      {isMobile && modalOpen ? (
        <form className="admin-delivery-area-form admin-card" onSubmit={handleSimpleSubmit}>
          <h3 className="admin-delivery-area-form-title">
            {editingId ? 'Editar área' : 'Nova área'}
          </h3>
          {exclusions.length > 0 ? (
            <p className="admin-help-text">
              Há {exclusions.length} exclus
              {exclusions.length === 1 ? 'ão' : 'ões'} no mapa. Elas continuam valendo; para
              alterá-las, use o computador.
            </p>
          ) : null}
          <div className="admin-delivery-zone-form-grid admin-entregador-form-grid">
            <div className="admin-form-group">
              <label className="admin-label" htmlFor="delivery-zone-simple-nome">
                Nome da área
              </label>
              <input
                id="delivery-zone-simple-nome"
                className="admin-input"
                value={draft.nome}
                onChange={(e) => setDraft((d) => ({ ...d, nome: e.target.value }))}
                placeholder="Ex: Centro"
                autoFocus
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label" htmlFor="delivery-zone-simple-raio">
                Raio máximo (km)
              </label>
              <input
                id="delivery-zone-simple-raio"
                className="admin-input"
                value={draft.raio_km}
                onChange={(e) => setDraft((d) => ({ ...d, raio_km: e.target.value }))}
                inputMode="decimal"
                placeholder="3"
              />
              <p className="admin-help-text">
                De {RAIO_MIN} a {RAIO_MAX} km a partir da loja.
              </p>
            </div>
            <div className="admin-form-group">
              <label className="admin-label" htmlFor="delivery-zone-simple-taxa">
                Taxa de entrega
              </label>
              <input
                id="delivery-zone-simple-taxa"
                className="admin-input"
                value={draft.taxa_entrega}
                onChange={(e) => setDraft((d) => ({ ...d, taxa_entrega: e.target.value }))}
                placeholder="4,25"
                inputMode="decimal"
              />
            </div>
          </div>
          {formError ? (
            <p className="admin-delivery-zone-error" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="admin-delivery-area-form-actions">
            <button type="button" className="admin-btn" onClick={resetForm} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving
                ? 'Salvando…'
                : editingId
                  ? 'Salvar alterações'
                  : 'Cadastrar área'}
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

      {!isMobile ? (
        <DeliveryZoneModal
          open={modalOpen}
          onClose={resetForm}
          onSave={handleSave}
          initialDraft={draft}
          initialExclusions={exclusions}
          editing={Boolean(editingId)}
          storeLat={storeLat}
          storeLng={storeLng}
          storeLabel={storeLabel}
          saving={saving}
        />
      ) : null}
    </div>
  );
}
