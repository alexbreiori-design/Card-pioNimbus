'use client';

import { useEffect, useState } from 'react';
import { useAdminData } from '@/hooks/useAdminData';
import { useEmpresa } from '@/hooks/useEmpresa';
import { getEmpresaBySlug, mergeEmpresaIntoLoja, updateEmpresaBySlug } from '@/lib/supabase/empresa';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminIcon from '@/components/admin/AdminIcon';

export default function IntegracoesPage() {
  const { data, saveData } = useAdminData();
  const { slug, loading: empresaLoading } = useEmpresa();
  const [pixelId, setPixelId] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getEmpresaBySlug(slug)
      .then((empresa) => {
        const merged = mergeEmpresaIntoLoja(data.loja, empresa);
        setPixelId(merged.metaPixelId || '');
      })
      .catch(() => {
        setPixelId(data.loja?.metaPixelId || '');
      });
  }, [slug, data.loja]);

  async function save() {
    if (!slug) {
      setMsg('Configure o slug da loja em Minha loja.');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      await updateEmpresaBySlug(slug, { meta_pixel_id: pixelId.trim() || null });
      saveData((prev) => ({
        ...prev,
        loja: { ...prev.loja, metaPixelId: pixelId.trim() },
      }));
      setMsg('Pixel salvo com sucesso.');
    } catch (e) {
      setMsg(e?.message || 'Erro ao salvar pixel.');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 2800);
    }
  }

  return (
    <div className="admin-content admin-content-pedidos admin-low-info-page">
      {msg ? <div className="admin-store-message">{msg}</div> : null}

      <AdminPageHeader title="Integrações" icon="integration" />

      <div className="admin-card admin-integration-card">
          <h2 className="admin-section-heading admin-integration-heading">
            <AdminIcon name="meta" className="admin-meta-icon" />
            Meta Pixel
          </h2>
          <p className="admin-help-text" style={{ marginBottom: 16 }}>
            O script é carregado apenas no cardápio online. Se o ID estiver vazio, nada é enviado ao Meta.
          </p>
          <div className="admin-form-group">
            <label className="admin-label">ID do Pixel</label>
            <input
              className="admin-input"
              placeholder="Ex: 123456789012345, somente números do Pixel"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              disabled={empresaLoading || saving}
            />
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={save}
            disabled={saving || empresaLoading}
          >
            Salvar
          </button>
        </div>
    </div>
  );
}
