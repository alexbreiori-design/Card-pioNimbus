'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminToast } from '@/context/AdminToastContext';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { buildNimbusWhatsAppUrl } from '@/lib/nimbusSupport';
import { getSiteOrigin } from '@/lib/siteUrl';
import SuperAdminNavIcon from './SuperAdminNavIcon';
import { SaSistemaSkeleton } from './SuperAdminSkeletons';

const DOMAIN_ROUTES = [
  { path: '/login', label: 'Login dos lojistas' },
  { path: '/{slug}', label: 'Cardápio público de cada loja' },
  { path: '/home', label: 'Landing comercial' },
];

const FEATURE_FLAGS = [
  {
    key: 'NIMBUS_ASSINATURA_UI_ENABLED',
    label: 'Bloco de assinatura no admin do lojista (servidor)',
  },
  {
    key: 'NEXT_PUBLIC_NIMBUS_ASSINATURA_UI_ENABLED',
    label: 'Espelho client-safe do flag acima',
  },
  {
    key: 'assinatura_nimbus_habilitada',
    label: 'Switch por loja (aba Operação, em cada loja) — precisa das duas flags acima também',
  },
];

function formatUpdatedAt(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return null;
  }
}

export default function SistemaPanel() {
  const [form, setForm] = useState({
    nome_exibicao: '',
    whatsapp_suporte: '',
    email: '',
  });
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(null);
  const toast = useAdminToast();

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
      toast.error(loadError?.message || 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/super-admin/billing')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled) setStripeConfigured(Boolean(payload?.stripeConfigured));
      })
      .catch(() => {
        if (!cancelled) setStripeConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
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
      toast.success('Perfil atualizado. O link de suporte no admin dos lojistas usa o WhatsApp salvo aqui.');
    } catch (saveError) {
      toast.error(saveError?.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRebuildCatalogs() {
    const confirmed = window.confirm(
      'Reconstruir o catálogo público de todas as lojas? Use apenas se o cardápio público estiver desatualizado.'
    );
    if (!confirmed) return;
    setRebuilding(true);
    try {
      const response = await fetch('/api/super-admin/rebuild-catalogs', { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível reconstruir os catálogos.');
      }
      toast.success(`Catálogos reconstruídos: ${payload.rebuilt}/${payload.total} loja(s).`);
    } catch (rebuildError) {
      toast.error(rebuildError?.message || 'Erro ao reconstruir catálogos.');
    } finally {
      setRebuilding(false);
    }
  }

  return (
    <div className="admin-content admin-sistema-page">
      <AdminPageHeader title="Sistema" iconNode={<SuperAdminNavIcon name="configuracoes" />} />

      <p className="admin-sistema-intro admin-sistema-intro-tight">
        Perfil Nimbus, domínio público, ferramentas de manutenção e flags de configuração do produto.
      </p>

      {loading ? (
        <SaSistemaSkeleton />
      ) : (
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

          <p className="admin-sistema-muted admin-sistema-config-hint" style={{ marginTop: 12 }}>
            Domínio custom do lojista (CNAME → plataforma) — em breve. Hoje cada loja usa{' '}
            <code>{'{slug}.' + canonicalHost}</code> ou o path <code>/{'{slug}'}</code>.
          </p>
        </section>

        <section className="admin-card admin-sistema-panel-card">
          <h2 className="admin-sistema-section-title">Planos</h2>
          <p className="admin-sistema-muted admin-sistema-config-hint">
            Três Prices ativos na Stripe Billing. O Checkout do HQ deixa escolher o plano por loja.
          </p>
          <ul className="admin-sistema-env-checklist">
            <li>
              <code>STRIPE_PRICE_LOJA_NOVA</code>
              <span>Loja Nova — R$ 149,90/mês (default do checkout).</span>
            </li>
            <li>
              <code>STRIPE_PRICE_SEGUNDA_LOJA</code>
              <span>Segunda Loja — R$ 119,90/mês.</span>
            </li>
            <li>
              <code>STRIPE_PRICE_LOJA_COMPLEMENTAR</code>
              <span>Loja Complementar — R$ 99,90/mês.</span>
            </li>
          </ul>
        </section>

        <section className="admin-card admin-sistema-panel-card">
          <h2 className="admin-sistema-section-title">Ferramentas</h2>
          <p className="admin-sistema-muted admin-sistema-config-hint">
            Ações de manutenção que afetam todas as lojas — use com cautela.
          </p>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={handleRebuildCatalogs}
            disabled={rebuilding}
          >
            {rebuilding ? 'Reconstruindo...' : 'Reconstruir catálogos públicos'}
          </button>
        </section>

        <section className="admin-card admin-sistema-panel-card">
          <h2 className="admin-sistema-section-title">Cobrança Stripe</h2>
          {stripeConfigured === null ? (
            <p className="admin-sistema-muted">Verificando configuração...</p>
          ) : (
            <p className={`admin-sistema-health-pill ${stripeConfigured ? 'ok' : 'bad'}`}>
              {stripeConfigured ? 'Stripe configurado neste ambiente' : 'STRIPE_SECRET_KEY ausente'}
            </p>
          )}
          <ul className="admin-sistema-env-checklist">
            <li>
              <code>STRIPE_SECRET_KEY</code>
              <span>Chave secreta da conta Stripe (servidor).</span>
            </li>
            <li>
              <code>STRIPE_WEBHOOK_SECRET</code>
              <span>Assinatura do endpoint /api/stripe/webhook.</span>
            </li>
            <li>
              <code>STRIPE_PRICE_LOJA_NOVA</code>
              <span>Price ID Loja Nova (R$ 149,90).</span>
            </li>
            <li>
              <code>STRIPE_PRICE_SEGUNDA_LOJA</code>
              <span>Price ID Segunda Loja (R$ 119,90).</span>
            </li>
            <li>
              <code>STRIPE_PRICE_LOJA_COMPLEMENTAR</code>
              <span>Price ID Loja Complementar (R$ 99,90).</span>
            </li>
            <li>
              <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>
              <span>Chave pública (Checkout hospedado não exige no client hoje).</span>
            </li>
          </ul>
        </section>

        <section className="admin-card admin-sistema-panel-card">
          <h2 className="admin-sistema-section-title">Feature flags</h2>
          <ul className="admin-sistema-env-checklist">
            {FEATURE_FLAGS.map((flag) => (
              <li key={flag.key}>
                <code>{flag.key}</code>
                <span>{flag.label}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      )}
    </div>
  );
}
