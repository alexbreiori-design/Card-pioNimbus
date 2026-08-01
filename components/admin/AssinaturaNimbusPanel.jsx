'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { NIMBUS_ASSINATURA_UI_ENABLED } from '@/lib/features';
import { useAdminToast } from '@/context/AdminToastContext';
import { AdminSkeletonBlock } from '@/components/admin/AdminSkeleton';

function formatCurrencyCents(value) {
  if (value === null || value === undefined) return '—';
  return (Number(value) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}

function formatDateLong(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

function IconCrown() {
  return <i className="ph ph-crown-simple" aria-hidden="true" />;
}

function IconCalendar({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3v4M16 3v4M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconCalendarCallout() {
  return <IconCalendar size={32} />;
}

function IconPackage() {
  return <i className="ph ph-package" aria-hidden="true" />;
}

function IconTag() {
  return <i className="ph ph-tag" aria-hidden="true" />;
}

function IconPulse() {
  return <i className="ph ph-pulse" aria-hidden="true" />;
}

function resolveHeroCopy({ statusId, hasCarencia, needsCheckout, isPastDue, carenciaLong, nextBillingLong }) {
  if (isPastDue) {
    return {
      headline: 'Há um pagamento pendente na sua assinatura.',
      body: 'Atualize a forma de pagamento no portal para evitar interrupção do Cardápio Nimbus.',
      calloutLabel: 'Regularize até a próxima tentativa',
      calloutValue: nextBillingLong || 'o quanto antes',
      showCallout: true,
    };
  }
  if (hasCarencia) {
    return {
      headline: 'Seu plano está em período de carência.',
      body: 'Aproveite todos os recursos do Cardápio Nimbus. A cobrança será iniciada automaticamente ao final do período.',
      calloutLabel: 'A cobrança será iniciada em',
      calloutValue: carenciaLong || '—',
      showCallout: Boolean(carenciaLong),
    };
  }
  if (needsCheckout) {
    return {
      headline: 'Ative sua assinatura Nimbus.',
      body: 'Conclua o checkout para liberar a cobrança e manter sua loja com o plano escolhido.',
      calloutLabel: null,
      calloutValue: null,
      showCallout: false,
    };
  }
  if (statusId === 'active' || statusId === 'trialing') {
    return {
      headline: 'Sua assinatura está ativa.',
      body: 'Gerencie cartão, faturas e cancelamento pelo portal Stripe quando precisar.',
      calloutLabel: 'Próxima cobrança em',
      calloutValue: nextBillingLong || '—',
      showCallout: Boolean(nextBillingLong),
    };
  }
  return {
    headline: 'Acompanhe o plano da sua loja.',
    body: 'Veja status, valor e cobrança da Assinatura Nimbus por aqui.',
    calloutLabel: null,
    calloutValue: null,
    showCallout: false,
  };
}

function AssinaturaHeroSkeleton() {
  return (
    <section
      className="admin-integration-section admin-assinatura-hero"
      aria-busy="true"
      aria-label="Carregando assinatura"
    >
      <div className="admin-integration-section-header">
        <AdminSkeletonBlock style={{ width: 180, height: 22 }} />
        <AdminSkeletonBlock style={{ width: '55%', maxWidth: 360, height: 14, marginTop: 10 }} />
      </div>
      <div className="admin-assinatura-hero-panel">
        <div className="admin-assinatura-hero-grid">
          <div className="admin-assinatura-hero-story">
            <AdminSkeletonBlock style={{ width: 72, height: 72, borderRadius: 999 }} />
            <div className="admin-assinatura-hero-story-content">
              <AdminSkeletonBlock style={{ width: 96, height: 22, borderRadius: 999 }} />
              <AdminSkeletonBlock style={{ width: '88%', height: 22, marginTop: 14 }} />
              <AdminSkeletonBlock style={{ width: '92%', height: 14, marginTop: 12 }} />
              <AdminSkeletonBlock style={{ width: '70%', height: 14, marginTop: 8 }} />
              <AdminSkeletonBlock style={{ width: '100%', height: 64, borderRadius: 12, marginTop: 18 }} />
              <div className="admin-assinatura-hero-actions" style={{ marginTop: 18 }}>
                <AdminSkeletonBlock style={{ width: 160, height: 40, borderRadius: 10 }} />
                <AdminSkeletonBlock style={{ width: 168, height: 40, borderRadius: 10 }} />
              </div>
            </div>
          </div>
          <div className="admin-assinatura-hero-details">
            <div className="admin-assinatura-hero-details-list">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="admin-assinatura-hero-detail-row">
                  <AdminSkeletonBlock style={{ width: 36, height: 36, borderRadius: 10 }} />
                  <div style={{ flex: 1 }}>
                    <AdminSkeletonBlock style={{ width: 72, height: 11 }} />
                    <AdminSkeletonBlock style={{ width: 110, height: 15, marginTop: 8 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AssinaturaNimbusPanelInner({ slug }) {
  const toast = useAdminToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [enabled, setEnabled] = useState(false);
  const [assinatura, setAssinatura] = useState(null);
  const [needsCheckout, setNeedsCheckout] = useState(false);
  const [canOpenPortal, setCanOpenPortal] = useState(false);
  const [hasCarencia, setHasCarencia] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState(null);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/billing?slug=${encodeURIComponent(slug)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        setEnabled(false);
        setAssinatura(null);
        setNeedsCheckout(false);
        setCanOpenPortal(false);
        setHasCarencia(false);
        return;
      }
      setEnabled(Boolean(payload.enabled));
      setAssinatura(payload.assinatura || null);
      setNeedsCheckout(Boolean(payload.needsCheckout));
      setCanOpenPortal(Boolean(payload.canOpenPortal));
      setHasCarencia(Boolean(payload.hasCarencia));
    } catch {
      setEnabled(false);
      setAssinatura(null);
      setNeedsCheckout(false);
      setCanOpenPortal(false);
      setHasCarencia(false);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!NIMBUS_ASSINATURA_UI_ENABLED || !slug) {
      setLoading(false);
      return;
    }
    load();
  }, [load, slug]);

  useEffect(() => {
    if (!NIMBUS_ASSINATURA_UI_ENABLED) return;
    const billing = String(searchParams?.get('billing') || '').trim().toLowerCase();
    if (!billing) return;

    if (billing === 'sucesso') {
      toast.success('Assinatura confirmada. Os dados podem levar alguns segundos para atualizar.');
      load();
    } else if (billing === 'cancelado') {
      toast.warning('Checkout cancelado. Você pode tentar de novo quando quiser.');
    }

    const next = new URLSearchParams(searchParams?.toString() || '');
    next.delete('billing');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, toast, load]);

  async function openCheckout() {
    if (!slug) return;
    setBusyAction('checkout');
    try {
      const response = await fetch('/api/admin/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível iniciar o checkout.');
      }
      if (payload.url) {
        window.location.assign(payload.url);
        return;
      }
      throw new Error('URL de checkout indisponível.');
    } catch (error) {
      toast.error(error?.message || 'Erro ao iniciar o checkout.');
    } finally {
      setBusyAction(null);
    }
  }

  async function openPortal() {
    if (!slug) return;
    setBusyAction('portal');
    try {
      const response = await fetch('/api/admin/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível abrir o portal de cobrança.');
      }
      if (payload.url) {
        window.open(payload.url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      toast.error(error?.message || 'Erro ao abrir o portal de cobrança.');
    } finally {
      setBusyAction(null);
    }
  }

  if (!NIMBUS_ASSINATURA_UI_ENABLED) return null;
  if (loading) return <AssinaturaHeroSkeleton />;
  if (!enabled) return null;

  const statusId = assinatura?.display?.id || 'none';
  const statusLabel = assinatura?.display?.label || 'Sem assinatura';
  const isPastDue = statusId === 'past_due' || statusId === 'unpaid';
  const billingDate = hasCarencia
    ? assinatura?.carenciaFim || assinatura?.trialEnd
    : assinatura?.currentPeriodEnd;
  const detailDateLabel = hasCarencia ? 'Fim da carência' : 'Próxima cobrança';
  const copy = resolveHeroCopy({
    statusId,
    hasCarencia,
    needsCheckout,
    isPastDue,
    carenciaLong: formatDateLong(assinatura?.carenciaFim || assinatura?.trialEnd),
    nextBillingLong: formatDateLong(assinatura?.currentPeriodEnd),
  });

  return (
    <section
      className="admin-integration-section admin-assinatura-hero"
      aria-labelledby="nimbus-subscription-title"
    >
      <div className="admin-integration-section-header">
        <h2 id="nimbus-subscription-title">Assinatura Nimbus</h2>
        <p>Acompanhe seu plano atual, prazo de carência e detalhes da cobrança.</p>
      </div>

      <div
        className={`admin-assinatura-hero-panel${isPastDue ? ' is-warning' : ''}${
          hasCarencia ? ' is-carencia' : ''
        }`}
      >
        <div className="admin-assinatura-hero-grid">
          <div className="admin-assinatura-hero-story">
            <div className="admin-assinatura-hero-badge-icon" aria-hidden="true">
              <IconCrown />
            </div>

            <div className="admin-assinatura-hero-story-content">
              <span className="admin-assinatura-hero-pill" data-status={statusId}>
                {statusLabel}
              </span>

              <h3 className="admin-assinatura-hero-headline">{copy.headline}</h3>
              <p className="admin-assinatura-hero-body">{copy.body}</p>

              {copy.showCallout ? (
                <div className="admin-assinatura-hero-callout">
                  <span className="admin-assinatura-hero-callout-icon" aria-hidden="true">
                    <IconCalendarCallout />
                  </span>
                  <div>
                    <span className="admin-assinatura-hero-callout-label">{copy.calloutLabel}</span>
                    <strong className="admin-assinatura-hero-callout-value">{copy.calloutValue}</strong>
                  </div>
                </div>
              ) : null}

              <div className="admin-assinatura-hero-actions">
                {needsCheckout ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={openCheckout}
                    disabled={Boolean(busyAction)}
                  >
                    {busyAction === 'checkout' ? 'Abrindo checkout...' : 'Concluir assinatura'}
                  </button>
                ) : null}

                {canOpenPortal ? (
                  <button
                    type="button"
                    className={
                      needsCheckout
                        ? 'admin-btn admin-assinatura-hero-btn-secondary'
                        : 'admin-btn admin-btn-primary'
                    }
                    onClick={openPortal}
                    disabled={Boolean(busyAction)}
                  >
                    {busyAction === 'portal'
                      ? 'Abrindo...'
                      : isPastDue
                        ? 'Atualizar pagamento'
                        : (
                            <>
                              Gerenciar assinatura
                              <span className="admin-assinatura-hero-btn-arrow" aria-hidden="true">
                                →
                              </span>
                            </>
                          )}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="admin-assinatura-hero-details">
            <div className="admin-assinatura-hero-details-list" role="list">
              <div className="admin-assinatura-hero-detail-row" role="listitem">
                <span className="admin-assinatura-hero-detail-icon" aria-hidden="true">
                  <IconPackage />
                </span>
                <div>
                  <span>Plano</span>
                  <strong>{assinatura?.planoLabel || '—'}</strong>
                </div>
              </div>
              <div className="admin-assinatura-hero-detail-row" role="listitem">
                <span className="admin-assinatura-hero-detail-icon" aria-hidden="true">
                  <IconTag />
                </span>
                <div>
                  <span>Valor mensal</span>
                  <strong>{formatCurrencyCents(assinatura?.valorCentavos)}</strong>
                </div>
              </div>
              <div className="admin-assinatura-hero-detail-row" role="listitem">
                <span className="admin-assinatura-hero-detail-icon" aria-hidden="true">
                  <IconPulse />
                </span>
                <div>
                  <span>Status</span>
                  <strong data-status={statusId}>{statusLabel}</strong>
                </div>
              </div>
              <div className="admin-assinatura-hero-detail-row" role="listitem">
                <span className="admin-assinatura-hero-detail-icon" aria-hidden="true">
                  <IconCalendar />
                </span>
                <div>
                  <span>{detailDateLabel}</span>
                  <strong>{formatDate(billingDate)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AssinaturaNimbusPanel({ slug }) {
  if (!NIMBUS_ASSINATURA_UI_ENABLED) return null;

  return (
    <Suspense fallback={<AssinaturaHeroSkeleton />}>
      <AssinaturaNimbusPanelInner slug={slug} />
    </Suspense>
  );
}
