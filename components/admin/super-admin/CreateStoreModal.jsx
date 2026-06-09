'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminDatePicker from '@/components/admin/AdminDatePicker';
import AdminDiscardDialog from '@/components/admin/AdminDiscardDialog';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import { isJsonDirty } from '@/lib/admin/isFormDirty';
import SegmentCombobox from '@/components/admin/SegmentCombobox';
import { generateTempPassword, isValidStoreSlug } from '@/lib/superAdmin';
import { getSiteOrigin } from '@/lib/siteUrl';

function emptyForm() {
  return {
    slug: '',
    nome: '',
    ownerEmail: '',
    ownerName: '',
    telefone: '',
    cidade: '',
    segmento: '',
    secondUnit: false,
    cloneFromModel: true,
    goLiveDate: '',
    tempPassword: generateTempPassword(),
  };
}

export default function CreateStoreModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [formBaseline, setFormBaseline] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      const initial = emptyForm();
      setForm(initial);
      setFormBaseline(initial);
      setError('');
    }
  }, [open]);

  const isDirty = useMemo(() => {
    if (!open || !formBaseline) return false;
    return isJsonDirty(form, formBaseline);
  }, [open, form, formBaseline]);

  const {
    overlayPointerDown,
    overlayClick,
    requestClose,
    discardOpen,
    confirmDiscard,
    cancelDiscard,
  } = useAdminOverlayClose({ onClose, isDirty });

  const previewUrl = useMemo(() => {
    const slug = String(form.slug || '').trim().toLowerCase();
    if (!isValidStoreSlug(slug)) return null;
    return `${getSiteOrigin()}/${slug}`;
  }, [form.slug]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function regeneratePassword() {
    updateField('tempPassword', generateTempPassword());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      const response = await fetch('/api/super-admin/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: form.slug,
          nome: form.nome,
          ownerEmail: form.ownerEmail,
          ownerName: form.ownerName,
          telefone: form.telefone,
          cidade: form.cidade,
          segmento: form.segmento,
          secondUnit: form.secondUnit,
          cloneFromModel: form.cloneFromModel,
          goLiveDate: form.goLiveDate || null,
          tempPassword: form.secondUnit ? undefined : form.tempPassword,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível criar a loja.');
      }
      onCreated?.(payload);
      onClose?.();
    } catch (submitError) {
      setError(submitError?.message || 'Erro ao criar loja.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="admin-sistema-modal-backdrop"
      role="presentation"
      onPointerDown={overlayPointerDown}
      onClick={overlayClick}
    >
      <div
        className="admin-sistema-modal admin-sistema-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-store-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="admin-sistema-modal-header">
          <h2 id="create-store-title">Nova loja</h2>
          <button type="button" className="admin-sistema-modal-close" onClick={requestClose} aria-label="Fechar">
            ×
          </button>
        </header>

        <form className="admin-sistema-modal-form" onSubmit={handleSubmit}>
          <div className="admin-sistema-option-cards">
            <button
              type="button"
              className={`admin-sistema-option-card${form.secondUnit ? ' is-on' : ''}`}
              onClick={() => updateField('secondUnit', !form.secondUnit)}
            >
              <span className="admin-sistema-option-card-icon" aria-hidden="true">
                2ª
              </span>
              <strong>Segunda unidade</strong>
              <span>Vincular dono já cadastrado — mesmo e-mail, sem criar Auth novo</span>
            </button>
            <button
              type="button"
              className={`admin-sistema-option-card${form.cloneFromModel ? ' is-on' : ''}`}
              onClick={() => updateField('cloneFromModel', !form.cloneFromModel)}
            >
              <span className="admin-sistema-option-card-icon" aria-hidden="true">
                ⧉
              </span>
              <strong>Copiar loja modelo</strong>
              <span>Produtos, categorias e configurações — sem pedidos nem clientes</span>
            </button>
          </div>

          <div className="admin-sistema-field-grid">
            <label>
              Slug (URL)
              <input
                className="admin-input"
                value={form.slug}
                onChange={(event) => updateField('slug', event.target.value)}
                placeholder="nome-loja"
                required
                autoComplete="off"
              />
            </label>
            <label>
              Nome fantasia
              <input
                className="admin-input"
                value={form.nome}
                onChange={(event) => updateField('nome', event.target.value)}
                placeholder="Nome da Loja"
                required
              />
            </label>
            <label>
              E-mail do proprietário
              <input
                className="admin-input"
                type="email"
                value={form.ownerEmail}
                onChange={(event) => updateField('ownerEmail', event.target.value)}
                placeholder="dono@loja.com"
                required
              />
            </label>
            <label>
              Nome do proprietário
              <input
                className="admin-input"
                value={form.ownerName}
                onChange={(event) => updateField('ownerName', event.target.value)}
                placeholder="Opcional — usa nome da loja"
              />
            </label>
            <label>
              Telefone / WhatsApp
              <input
                className="admin-input"
                value={form.telefone}
                onChange={(event) => updateField('telefone', event.target.value)}
                placeholder="(43) 99999-9999"
              />
            </label>
            <label>
              Cidade
              <input
                className="admin-input"
                value={form.cidade}
                onChange={(event) => updateField('cidade', event.target.value)}
                placeholder="Londrina"
              />
            </label>
            <label className="admin-sistema-field-span">
              <span>Segmento</span>
              <SegmentCombobox
                value={form.segmento}
                onChange={(value) => updateField('segmento', value)}
              />
            </label>
          </div>

          {previewUrl ? (
            <p className="admin-sistema-preview">
              Cardápio: <a href={previewUrl}>{previewUrl}</a>
            </p>
          ) : null}

          {!form.secondUnit ? (
            <div className="admin-sistema-password-row">
              <label>
                Senha temporária
                <input
                  className="admin-input"
                  value={form.tempPassword}
                  onChange={(event) => updateField('tempPassword', event.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </label>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={regeneratePassword}>
                Gerar outra
              </button>
            </div>
          ) : null}

          <label className="admin-sistema-date-field admin-sistema-date-field-compact">
            <span className="admin-label">Data go-live (opcional)</span>
            <AdminDatePicker
              compact
              value={form.goLiveDate}
              onChange={(value) => updateField('goLiveDate', value)}
            />
          </label>

          {error ? <p className="admin-sistema-error">{error}</p> : null}

          <footer className="admin-sistema-modal-footer">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={requestClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>
              {busy ? 'Criando...' : 'Criar loja'}
            </button>
          </footer>
        </form>
      </div>
      <AdminDiscardDialog
        open={discardOpen}
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      />
    </div>
  );
}
