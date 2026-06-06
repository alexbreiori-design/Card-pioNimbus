'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { buildNimbusWhatsAppUrl } from '@/lib/nimbusSupport';
import { getSiteOrigin } from '@/lib/siteUrl';

const DOMAIN_ROUTES = [
  { path: '/login', label: 'Login dos lojistas' },
  { path: '/{slug}', label: 'Cardápio público de cada loja' },
  { path: '/home', label: 'Landing comercial' },
];

function formatUpdatedAt(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return null;
  }
}

export default function ConfiguracoesPanel() {
  const [form, setForm] = useState({
    nome_exibicao: '',
    whatsapp_suporte: '',
    email: '',
  });
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const siteOrigin = useMemo(() => getSiteOrigin(), []);
  const canonicalHost = useMemo(() => {
    try {
      return new URL(siteOrigin).host;
    } catch {
      return siteOrigin.replace(/^https?:\/\//, '');
    }
  }, [siteOrigin]);

  const supportPreviewUrl = useMemo(
    () => buildNimbusWhatsAppUrl(form.whatsapp_suporte),
    [form.whatsapp_suporte]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/super-admin/profile');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível carregar o perfil.');
      }
      const profile = payload.profile || {};
      setForm({
        nome_exibicao: profile.nome_exibicao || '',
        whatsapp_suporte: profile.whatsapp_suporte || '',
        email: profile.email || '',
      });
      setUpdatedAt(profile.updated_at || null);
    } catch (loadError) {
      setError(loadError?.message || 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess('');
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/super-admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível salvar.');
      }
      const profile = payload.profile || {};
      setForm({
        nome_exibicao: profile.nome_exibicao || '',
        whatsapp_suporte: profile.whatsapp_suporte || '',
        email: profile.email || '',
      });
      setUpdatedAt(profile.updated_at || null);
      setSuccess('Perfil atualizado. O link de suporte no admin dos lojistas usa o WhatsApp salvo aqui.');
    } catch (saveError) {
      setError(saveError?.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-content admin-sistema-page">
      <AdminPageHeader title="Configurações" icon="category" />

      <p className="admin-sistema-intro admin-sistema-intro-tight">
        Perfil Nimbus e domínio público do produto — usado na saudação do Início e no suporte da sidebar
        admin.
      </p>

      {error ? <p className="admin-sistema-error">{error}</p> : null}
      {loading ? <p className="admin-sistema-muted">Carregando...</p> : null}

      <div className="admin-sistema-config-grid">
        <section className="admin-card admin-sistema-panel-card">
          <h2 className="admin-sistema-section-title">Perfil</h2>
          <p className="admin-sistema-muted admin-sistema-config-hint">
            Nome exibido no painel e WhatsApp que os lojistas usam ao clicar em Suporte.
          </p>

          <form className="admin-sistema-config-form" onSubmit={handleSave}>
            <label>
              <span className="admin-label">Nome de exibição</span>
              <input
                className="admin-input"
                value={form.nome_exibicao}
                onChange={(event) => updateField('nome_exibicao', event.target.value)}
                placeholder="Ex.: Alex"
                required
              />
            </label>

            <label>
              <span className="admin-label">WhatsApp de suporte</span>
              <input
                className="admin-input"
                value={form.whatsapp_suporte}
                onChange={(event) => updateField('whatsapp_suporte', event.target.value)}
                placeholder="(43) 99999-9999"
              />
              {supportPreviewUrl ? (
                <span className="admin-sistema-config-preview">
                  Link no admin:{' '}
                  <a href={supportPreviewUrl} target="_blank" rel="noopener noreferrer">
                    {supportPreviewUrl.replace('https://', '')}
                  </a>
                </span>
              ) : (
                <span className="admin-sistema-config-preview is-muted">
                  Sem WhatsApp — o admin usa o fallback do site (cardapionimbus.com.br).
                </span>
              )}
            </label>

            <label>
              <span className="admin-label">E-mail de contato (opcional)</span>
              <input
                className="admin-input"
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="contato@cardapionimbus.com.br"
              />
            </label>

            {formatUpdatedAt(updatedAt) ? (
              <p className="admin-sistema-muted admin-sistema-config-updated">
                Última alteração: {formatUpdatedAt(updatedAt)}
              </p>
            ) : null}

            {success ? <p className="admin-sistema-success-hint">{success}</p> : null}

            <div className="admin-sistema-config-actions">
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving || loading}>
                {saving ? 'Salvando...' : 'Salvar perfil'}
              </button>
            </div>
          </form>
        </section>

        <section className="admin-card admin-sistema-panel-card">
          <h2 className="admin-sistema-section-title">Domínio</h2>
          <p className="admin-sistema-muted admin-sistema-config-hint">
            Endereço canônico e rotas públicas do Cardápio Nimbus.
          </p>

          <dl className="admin-sistema-domain-list">
            <div>
              <dt>Site</dt>
              <dd>
                <a href={siteOrigin} target="_blank" rel="noopener noreferrer">
                  {canonicalHost}
                </a>
              </dd>
            </div>
            <div>
              <dt>Variável</dt>
              <dd>
                <code>NEXT_PUBLIC_SITE_URL</code>
              </dd>
            </div>
          </dl>

          <ul className="admin-sistema-domain-routes">
            {DOMAIN_ROUTES.map((route) => (
              <li key={route.path} className={route.muted ? 'is-muted' : ''}>
                <code>{route.path}</code>
                <span>{route.label}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
