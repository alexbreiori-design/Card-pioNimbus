'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import AdminDiscardDialog from '@/components/admin/AdminDiscardDialog';
import AdminTooltip from '@/components/admin/AdminTooltip';
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import SuperAdminNavIcon from './SuperAdminNavIcon';
import { AdminSkeletonBlock, AdminSkeletonLines } from '@/components/admin/AdminSkeleton';

const EMPTY_FORM = {
  title: '',
  description: '',
  ctaLabel: 'Experimente já',
  ctaHref: '',
  mediaPath: '',
  mediaType: '',
  mediaUrl: '',
  durationSeconds: 8,
};

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}

function statusLabel(status) {
  if (status === 'published') return 'Publicado';
  if (status === 'disabled') return 'Desativado';
  return 'Rascunho';
}

function serializeForm(form) {
  return JSON.stringify({
    title: form.title || '',
    description: form.description || '',
    ctaLabel: form.ctaLabel || '',
    ctaHref: form.ctaHref || '',
    mediaPath: form.mediaPath || '',
    mediaType: form.mediaType || '',
    durationSeconds: Number(form.durationSeconds) || 8,
  });
}

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.5l3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPublish() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M12 19V5M12 5l-5 5M12 5l5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDisable() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.5 7.5l9 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M5 7h14M10 11v6M14 11v6M8 7l1-2h6l1 2M7 7l1 12h8l1-12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NovidadesSkeleton() {
  return (
    <div className="admin-card admin-sistema-panel-card admin-sistema-panel-card-wide" aria-busy="true">
      <AdminSkeletonBlock style={{ width: 220, height: 38, borderRadius: 10, marginBottom: 18 }} />
      <AdminSkeletonLines count={5} />
    </div>
  );
}

export default function NovidadesPanel() {
  const toast = useAdminToast();
  const [items, setItems] = useState([]);
  const [storesTotal, setStoresTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formBaseline, setFormBaseline] = useState(() => serializeForm(EMPTY_FORM));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isDirty = editorOpen && serializeForm(form) !== formBaseline;

  const closeEditorHard = useCallback(() => {
    setEditorOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormBaseline(serializeForm(EMPTY_FORM));
  }, []);

  const {
    overlayPointerDown,
    overlayClick,
    requestClose,
    discardOpen,
    confirmDiscard,
    cancelDiscard,
  } = useAdminOverlayClose({
    onClose: closeEditorHard,
    isDirty,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/super-admin/whats-new');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível carregar as novidades.');
      }
      setItems(payload.items || []);
      setStoresTotal(Number(payload.storesTotal || 0));
    } catch (loadError) {
      setError(loadError?.message || 'Erro ao carregar.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedItems = useMemo(() => items, [items]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormBaseline(serializeForm(EMPTY_FORM));
    setEditorOpen(true);
  }

  function openEdit(item) {
    const next = {
      title: item.title || '',
      description: item.description || '',
      ctaLabel: item.ctaLabel || 'Experimente já',
      ctaHref: item.ctaHref || '',
      mediaPath: item.mediaPath || '',
      mediaType: item.mediaType || '',
      mediaUrl: item.mediaUrl || '',
      durationSeconds: item.durationSeconds || 8,
    };
    setEditingId(item.id);
    setForm(next);
    setFormBaseline(serializeForm(next));
    setEditorOpen(true);
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/super-admin/whats-new/upload', {
        method: 'POST',
        body,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Falha no upload.');
      }
      setForm((prev) => ({
        ...prev,
        mediaPath: payload.mediaPath,
        mediaType: payload.mediaType,
        mediaUrl: payload.mediaUrl,
      }));
      toast.success('Mídia enviada.');
    } catch (uploadError) {
      toast.error(uploadError?.message || 'Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  }

  async function saveEntry({ publish = false } = {}) {
    const title = form.title.trim();
    if (!title) {
      toast.error('Informe o título.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const response = await fetch(`/api/super-admin/whats-new/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description: form.description,
            ctaLabel: form.ctaLabel,
            ctaHref: form.ctaHref,
            mediaPath: form.mediaPath || null,
            mediaType: form.mediaType || null,
            durationSeconds: form.durationSeconds,
            ...(publish ? { status: 'published' } : {}),
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'Não foi possível salvar.');
        }
        setItems((prev) => prev.map((row) => (row.id === editingId ? payload.item : row)));
        toast.success(publish ? 'Novidade publicada.' : 'Novidade atualizada.');
      } else {
        const response = await fetch('/api/super-admin/whats-new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description: form.description,
            ctaLabel: form.ctaLabel,
            ctaHref: form.ctaHref,
            mediaPath: form.mediaPath || null,
            mediaType: form.mediaType || null,
            durationSeconds: form.durationSeconds,
            publish,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'Não foi possível criar.');
        }
        setItems((prev) => [payload.item, ...prev]);
        toast.success(publish ? 'Novidade publicada.' : 'Rascunho salvo.');
      }
      closeEditorHard();
    } catch (saveError) {
      toast.error(saveError?.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function publishItem(item) {
    setBusyId(item.id);
    try {
      const response = await fetch(`/api/super-admin/whats-new/${item.id}/publish`, {
        method: 'POST',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível publicar.');
      }
      setItems((prev) => prev.map((row) => (row.id === item.id ? payload.item : row)));
      toast.success('Publicado para os lojistas.');
    } catch (err) {
      toast.error(err?.message || 'Erro ao publicar.');
    } finally {
      setBusyId(null);
    }
  }

  async function disableItem(item) {
    setBusyId(item.id);
    try {
      const response = await fetch(`/api/super-admin/whats-new/${item.id}/disable`, {
        method: 'POST',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível desativar.');
      }
      setItems((prev) => prev.map((row) => (row.id === item.id ? payload.item : row)));
      toast.success('Novidade desativada.');
    } catch (err) {
      toast.error(err?.message || 'Erro ao desativar.');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const response = await fetch(`/api/super-admin/whats-new/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível remover.');
      }
      setItems((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      toast.success('Novidade removida.');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.message || 'Erro ao remover.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-content admin-sistema-page">
      <AdminPageHeader title="Novidades" iconNode={<SuperAdminNavIcon name="novidades" />} />

      <p className="admin-sistema-intro admin-sistema-intro-tight">
        Publique atualizações para o modal “Novidades” do Admin do lojista — título, descrição e
        imagem ou vídeo.
      </p>

      {error ? <p className="admin-sistema-error">{error}</p> : null}

      <div className="admin-sistema-toolbar" style={{ marginBottom: 16 }}>
        <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>
          Adicionar funcionalidade
        </button>
      </div>

      {loading ? (
        <NovidadesSkeleton />
      ) : (
        <div className="admin-card admin-sistema-panel-card admin-sistema-panel-card-wide">
          {sortedItems.length === 0 ? (
            <p className="admin-help-text" style={{ margin: 0 }}>
              Nenhuma novidade ainda. Clique em “Adicionar funcionalidade” para criar a primeira.
            </p>
          ) : (
            <div className="admin-whats-new-sa-table-wrap">
              <table className="admin-whats-new-sa-table">
                <thead>
                  <tr>
                    <th scope="col">Título</th>
                    <th scope="col">Status</th>
                    <th scope="col">Publicação</th>
                    <th scope="col">Lojas</th>
                    <th scope="col" className="admin-whats-new-sa-th-actions">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="admin-whats-new-sa-title-cell">
                          <div className="admin-whats-new-sa-thumb">
                            {item.mediaUrl && item.mediaType === 'image' ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.mediaUrl} alt="" />
                            ) : item.mediaUrl && item.mediaType === 'video' ? (
                              <span className="admin-whats-new-sa-thumb-video">Vídeo</span>
                            ) : (
                              <span className="admin-whats-new-sa-thumb-empty">—</span>
                            )}
                          </div>
                          <span className="admin-whats-new-sa-title-text">{item.title}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-whats-new-sa-status is-${item.status}`}>
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td>{formatDate(item.publishedAt)}</td>
                      <td>
                        {item.viewsCount || 0} / {item.storesTotal ?? storesTotal}
                      </td>
                      <td>
                        <div className="admin-whats-new-sa-icon-actions">
                          <AdminTooltip content="Editar" variant="light" side="top" delayMs={40}>
                            <button
                              type="button"
                              className="admin-whats-new-sa-icon-btn"
                              onClick={() => openEdit(item)}
                              disabled={busyId === item.id}
                              aria-label="Editar"
                            >
                              <IconEdit />
                            </button>
                          </AdminTooltip>
                          {item.status !== 'published' ? (
                            <AdminTooltip content="Publicar" variant="light" side="top" delayMs={40}>
                              <button
                                type="button"
                                className="admin-whats-new-sa-icon-btn is-primary"
                                onClick={() => publishItem(item)}
                                disabled={busyId === item.id}
                                aria-label="Publicar"
                              >
                                <IconPublish />
                              </button>
                            </AdminTooltip>
                          ) : (
                            <AdminTooltip content="Desativar" variant="light" side="top" delayMs={40}>
                              <button
                                type="button"
                                className="admin-whats-new-sa-icon-btn"
                                onClick={() => disableItem(item)}
                                disabled={busyId === item.id}
                                aria-label="Desativar"
                              >
                                <IconDisable />
                              </button>
                            </AdminTooltip>
                          )}
                          <AdminTooltip content="Remover" variant="light" side="top" delayMs={40}>
                            <button
                              type="button"
                              className="admin-whats-new-sa-icon-btn is-danger admin-whats-new-sa-icon-btn-last"
                              onClick={() => setDeleteTarget(item)}
                              disabled={busyId === item.id}
                              aria-label="Remover"
                            >
                              <IconTrash />
                            </button>
                          </AdminTooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {editorOpen ? (
        <div
          className="admin-confirm-overlay admin-confirm-overlay-top"
          role="presentation"
          onPointerDown={overlayPointerDown}
          onClick={overlayClick}
        >
          <div
            className="admin-card admin-whats-new-sa-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="whats-new-editor-title"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <h2 id="whats-new-editor-title">
              {editingId ? 'Editar funcionalidade' : 'Nova funcionalidade'}
            </h2>

            <label>
              <span className="admin-label">Título</span>
              <input
                className="admin-input"
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Ex.: Assinatura Nimbus no Admin"
              />
            </label>

            <label>
              <span className="admin-label">Descrição</span>
              <textarea
                className="admin-input"
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Explique o que mudou e o benefício para o lojista."
              />
            </label>

            <div className="admin-whats-new-sa-upload">
              <span className="admin-label">Imagem ou vídeo</span>
              <p className="admin-whats-new-sa-media-hint">
                Sugestão: 16:9 (ex. 1920×1080)
              </p>
              <div className="admin-whats-new-sa-upload-row">
                <label className="admin-btn admin-btn-ghost">
                  {uploading ? 'Enviando...' : 'Escolher arquivo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                    hidden
                    disabled={uploading || saving}
                    onChange={handleUpload}
                  />
                </label>
                {form.mediaPath ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        mediaPath: '',
                        mediaType: '',
                        mediaUrl: '',
                      }))
                    }
                  >
                    Remover mídia
                  </button>
                ) : null}
              </div>
              {form.mediaUrl ? (
                <div className="admin-whats-new-sa-preview">
                  {form.mediaType === 'video' ? (
                    <video src={form.mediaUrl} controls playsInline preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.mediaUrl} alt="Pré-visualização" />
                  )}
                </div>
              ) : (
                <p className="admin-help-text">JPG, PNG, WebP, GIF, MP4 ou WebM · máx. 20 MB</p>
              )}
            </div>

            <div className="admin-whats-new-sa-cta-fields">
              <label>
                <span className="admin-label">Duração do slide (segundos)</span>
                <input
                  className="admin-input"
                  type="number"
                  min={3}
                  max={120}
                  step={1}
                  value={form.durationSeconds}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      durationSeconds: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span className="admin-label">Texto do botão (opcional)</span>
                <input
                  className="admin-input"
                  type="text"
                  value={form.ctaLabel}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, ctaLabel: event.target.value }))
                  }
                  placeholder="Experimente já"
                />
              </label>
              <label>
                <span className="admin-label">Link do botão (opcional)</span>
                <input
                  className="admin-input"
                  type="text"
                  value={form.ctaHref}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, ctaHref: event.target.value }))
                  }
                  placeholder="/admin/integracoes"
                />
              </label>
            </div>

            <div className="admin-whats-new-sa-editor-actions">
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={requestClose}
                disabled={saving || uploading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => saveEntry({ publish: false })}
                disabled={saving || uploading}
              >
                {saving ? 'Salvando...' : 'Salvar rascunho'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => saveEntry({ publish: true })}
                disabled={saving || uploading}
              >
                {saving ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AdminDiscardDialog
        open={discardOpen}
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      />

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remover novidade?"
        message={
          deleteTarget
            ? `“${deleteTarget.title}” será removida permanentemente.`
            : ''
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
