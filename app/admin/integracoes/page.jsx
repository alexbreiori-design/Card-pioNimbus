'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import { useEmpresa } from '@/hooks/useEmpresa';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { META_STANDARD_EVENTS } from '@/lib/meta/pixel';
import { sanitizeMetaPixelId } from '@/lib/meta/pixel';
import { getEmpresaBySlug, mergeEmpresaIntoLoja, updateEmpresaBySlug } from '@/lib/supabase/empresa';

export default function IntegracoesPage() {
  const { data, saveData } = useAdminData();
  const { slug, loading: empresaLoading } = useEmpresa();

  const [savedPixelId, setSavedPixelId] = useState('');
  const [draftPixelId, setDraftPixelId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const toast = useAdminToast();
  const [saving, setSaving] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [editingPixel, setEditingPixel] = useState(false);

  const applyLoadedPixel = useCallback((loja) => {
    const safe = sanitizeMetaPixelId(loja?.metaPixelId) || '';
    setSavedPixelId(safe);
  }, []);

  useEffect(() => {
    if (!slug) {
      applyLoadedPixel(data.loja);
      return;
    }
    getEmpresaBySlug(slug)
      .then((empresa) => {
        applyLoadedPixel(mergeEmpresaIntoLoja(data.loja, empresa));
      })
      .catch(() => {
        applyLoadedPixel(data.loja);
      });
  }, [slug, data.loja, applyLoadedPixel]);

  const hasPixel = Boolean(savedPixelId);

  async function persistPixelId(nextRaw) {
    if (!slug) {
      toast.error('Configure o slug da loja em Minha loja.');
      return false;
    }
    const safe = sanitizeMetaPixelId(nextRaw);
    setSaving(true);
    try {
      await updateEmpresaBySlug(slug, { meta_pixel_id: safe });
      saveData((prev) => ({
        ...prev,
        loja: { ...prev.loja, metaPixelId: safe || '' },
      }));
      setSavedPixelId(safe || '');
      setDraftPixelId(safe || '');
      setFormOpen(false);
      toast.success(safe ? 'Pixel salvo com sucesso.' : 'Pixel removido.');
      return true;
    } catch (e) {
      toast.error(e?.message || 'Erro ao salvar pixel.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  function openNewForm() {
    setDraftPixelId('');
    setEditingPixel(false);
    setFormOpen(true);
  }

  function openEditForm() {
    setDraftPixelId(savedPixelId);
    setEditingPixel(true);
    setFormOpen(true);
  }

  function cancelForm() {
    setDraftPixelId(savedPixelId);
    setFormOpen(false);
  }

  async function handleSave() {
    const safe = sanitizeMetaPixelId(draftPixelId);
    if (!safe) {
      toast.error('Informe um ID do Pixel válido (apenas números).');
      return;
    }
    await persistPixelId(safe);
  }

  async function handleRemove() {
    setRemoveConfirmOpen(false);
    await persistPixelId('');
  }

  const eventsLabel = META_STANDARD_EVENTS.filter((e) => e !== 'PageView').join(', ');

  return (
    <div className="admin-content admin-content-pedidos admin-catalog-page admin-section-page admin-compact-card-page">
      <AdminPageHeader title="Integrações" icon="integration" />

      <div className="admin-card admin-store-block-card admin-compact-page-card admin-integration-card">
        <div className="admin-integration-meta-wrap admin-integration-meta-wrap-left">
          <Image
            className="admin-integration-meta-logo"
            src="/images/logo-meta.png"
            alt="Meta"
            width={148}
            height={32}
            priority
          />
        </div>

        <div className="admin-delivery-areas-toolbar">
          <p className="admin-help-text admin-delivery-areas-hint">
            O script é carregado somente no cardápio online. Eventos: PageView, {eventsLabel}.
          </p>
          {!hasPixel && !formOpen ? (
            <button type="button" className="admin-btn admin-btn-primary" onClick={openNewForm}>
              + Conectar Pixel
            </button>
          ) : null}
        </div>

        {formOpen ? (
          <form
            className="admin-delivery-area-form admin-card"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <h3 className="admin-delivery-area-form-title">
              {editingPixel ? 'Editar Meta Pixel' : 'Conectar Meta Pixel'}
            </h3>
            <div className="admin-form-group">
              <label className="admin-label" htmlFor="meta-pixel-id">
                ID do Pixel
              </label>
              <input
                id="meta-pixel-id"
                className="admin-input"
                placeholder="Ex: 123456789012345"
                inputMode="numeric"
                value={draftPixelId}
                onChange={(e) => setDraftPixelId(e.target.value.replace(/\D/g, ''))}
                disabled={empresaLoading || saving}
              />
            </div>
            <div className="admin-delivery-area-form-actions">
              <button type="button" className="admin-btn" onClick={cancelForm} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving || empresaLoading}>
                Salvar
              </button>
            </div>
          </form>
        ) : null}

        {hasPixel && !formOpen ? (
          <div className="admin-sparse-list">
            <div className="admin-sparse-row">
              <div className="admin-sparse-row-main">
                <span className="admin-sparse-row-code">Pixel {savedPixelId}</span>
                <span className="admin-sparse-row-sep" aria-hidden="true">
                  ·
                </span>
                <span className="admin-sparse-row-detail">
                  Rastreamento ativo · PageView, {eventsLabel}
                </span>
              </div>
              <div className="admin-sparse-row-actions">
                <button type="button" className="admin-link-btn" onClick={openEditForm}>
                  Editar
                </button>
                <button
                  type="button"
                  className="admin-link-btn admin-link-btn-danger"
                  onClick={() => setRemoveConfirmOpen(true)}
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {!hasPixel && !formOpen ? (
          <p className="admin-help-text admin-delivery-areas-empty">Nenhum Pixel conectado.</p>
        ) : null}
      </div>

      <AdminConfirmDialog
        open={removeConfirmOpen}
        title="Remover Meta Pixel"
        message="O rastreamento deixará de funcionar no cardápio até conectar um novo ID. Deseja remover?"
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        danger
        onCancel={() => setRemoveConfirmOpen(false)}
        onConfirm={() => void handleRemove()}
      />
    </div>
  );
}
