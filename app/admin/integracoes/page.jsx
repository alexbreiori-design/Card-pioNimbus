"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useAdminToast } from "@/context/AdminToastContext";
import { useAdminData } from "@/hooks/useAdminData";
import { useEmpresa } from "@/hooks/useEmpresa";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import MercadoPagoIntegrationCard from "@/components/admin/integrations/MercadoPagoIntegrationCard";
import PaymentProviderComingSoonCard from "@/components/admin/integrations/PaymentProviderComingSoonCard";
import {
  AdminContentReveal,
  AdminIntegracoesSkeleton,
} from "@/components/admin/AdminSkeleton";
import { META_STANDARD_EVENTS } from "@/lib/meta/pixel";
import { sanitizeMetaPixelId } from "@/lib/meta/pixel";
import {
  sanitizeGa4MeasurementId,
  sanitizeGtmContainerId,
} from "@/lib/analytics/googleTags";
import {
  getEmpresaBySlug,
  mergeEmpresaIntoLoja,
  updateEmpresaBySlug,
} from "@/lib/supabase/empresa";

export default function IntegracoesPage() {
  const { data, saveData } = useAdminData();
  const { slug, loading: empresaLoading } = useEmpresa();

  const [savedPixelId, setSavedPixelId] = useState("");
  const [draftPixelId, setDraftPixelId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const toast = useAdminToast();
  const [saving, setSaving] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [editingPixel, setEditingPixel] = useState(false);
  const [paymentIntegrationsEnabled, setPaymentIntegrationsEnabled] = useState(false);
  const [paymentProviderConnected, setPaymentProviderConnected] = useState(false);
  const [paymentsCheckDone, setPaymentsCheckDone] = useState(false);

  const applyLoadedPixel = useCallback((loja) => {
    const safe = sanitizeMetaPixelId(loja?.metaPixelId) || "";
    setSavedPixelId(safe);
  }, []);

  useEffect(() => {
    if (!slug) {
      queueMicrotask(() => applyLoadedPixel(data.loja));
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

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      setPaymentIntegrationsEnabled(false);
      setPaymentsCheckDone(false);
    });
    if (!slug) {
      queueMicrotask(() => setPaymentsCheckDone(true));
      return () => controller.abort();
    }

    fetch(`/api/admin/payments/account?slug=${encodeURIComponent(slug)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload) => {
        if (!controller.signal.aborted) {
          setPaymentIntegrationsEnabled(payload?.ok === true && payload?.enabled === true);
          setPaymentsCheckDone(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPaymentIntegrationsEnabled(false);
          setPaymentsCheckDone(true);
        }
      });

    return () => controller.abort();
  }, [slug]);

  const hasPixel = Boolean(savedPixelId);

  async function persistPixelId(nextRaw) {
    if (!slug) {
      toast.error("Configure o slug da loja em Minha loja.");
      return false;
    }
    const safe = sanitizeMetaPixelId(nextRaw);
    setSaving(true);
    try {
      await updateEmpresaBySlug(slug, { meta_pixel_id: safe });
      saveData((prev) => ({
        ...prev,
        loja: { ...prev.loja, metaPixelId: safe || "" },
      }));
      setSavedPixelId(safe || "");
      setDraftPixelId(safe || "");
      setFormOpen(false);
      toast.success(safe ? "Pixel salvo com sucesso." : "Pixel removido.");
      return true;
    } catch (e) {
      toast.error(e?.message || "Erro ao salvar pixel.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function openNewForm() {
    setDraftPixelId("");
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
      toast.error("Informe um ID do Pixel válido (apenas números).");
      return;
    }
    await persistPixelId(safe);
  }

  async function handleRemove() {
    setRemoveConfirmOpen(false);
    await persistPixelId("");
  }

  const eventsLabel = META_STANDARD_EVENTS.filter((e) => e !== "PageView").join(
    ", ",
  );

  return (
    <div className="admin-content admin-content-pedidos admin-catalog-page admin-section-page admin-compact-card-page">
      <AdminPageHeader title="Integrações" icon="integration" />

      {!paymentsCheckDone ? (
        <AdminIntegracoesSkeleton />
      ) : (
        <AdminContentReveal ready className="admin-integration-sections">
        {paymentIntegrationsEnabled ? (
          <section
            className="admin-integration-section"
            aria-labelledby="payment-integrations-title"
          >
            <div className="admin-integration-section-header">
              <h2 id="payment-integrations-title">Pagamentos</h2>
              <p>Receba pagamentos online diretamente na conta da sua empresa.</p>
            </div>

            <div className="admin-integration-cards-grid admin-integration-cards-grid-payments">
              <MercadoPagoIntegrationCard
                slug={slug}
                empresaLoading={empresaLoading}
                onConnectedChange={setPaymentProviderConnected}
              />
              <PaymentProviderComingSoonCard
                logo="/images/pagarme-logo.png"
                name="Pagar.me"
                description="Pix e cartão com recebimento pela sua conta Pagar.me."
                locked={paymentProviderConnected}
              />
              <PaymentProviderComingSoonCard
                logo="/images/PagBank-logo.png"
                name="PagBank"
                description="Pix e cartão com recebimento pela sua conta PagBank."
                locked={paymentProviderConnected}
              />
            </div>
          </section>
        ) : null}

        <section
          className="admin-integration-section"
          aria-labelledby="marketing-integrations-title"
        >
          <div className="admin-integration-section-header">
            <h2 id="marketing-integrations-title">Marketing</h2>
            <p>
              Conecte ferramentas de análise e campanhas ao seu cardápio online.
            </p>
          </div>

          <div className="admin-integration-cards-grid">
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
                  O script é carregado somente no cardápio online. Eventos:
                  PageView, {eventsLabel}.
                </p>
                {!hasPixel && !formOpen ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={openNewForm}
                  >
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
                    {editingPixel ? "Editar Meta Pixel" : "Conectar Meta Pixel"}
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
                      onChange={(e) =>
                        setDraftPixelId(e.target.value.replace(/\D/g, ""))
                      }
                      disabled={empresaLoading || saving}
                    />
                  </div>
                  <div className="admin-delivery-area-form-actions">
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={cancelForm}
                      disabled={saving}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="admin-btn admin-btn-primary"
                      disabled={saving || empresaLoading}
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              ) : null}

              {hasPixel && !formOpen ? (
                <div className="admin-sparse-list">
                  <div className="admin-sparse-row">
                    <div className="admin-sparse-row-main">
                      <span className="admin-sparse-row-code">
                        Pixel {savedPixelId}
                      </span>
                      <span className="admin-sparse-row-sep" aria-hidden="true">
                        ·
                      </span>
                      <span className="admin-sparse-row-detail">
                        Rastreamento ativo · PageView, {eventsLabel}
                      </span>
                    </div>
                    <div className="admin-sparse-row-actions">
                      <button
                        type="button"
                        className="admin-link-btn"
                        onClick={openEditForm}
                      >
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
                <p className="admin-help-text admin-delivery-areas-empty">
                  Nenhum Pixel conectado.
                </p>
              ) : null}
            </div>

            <GoogleAnalyticsIntegrationCard
              slug={slug}
              empresaLoading={empresaLoading}
            />
          </div>
        </section>
        </AdminContentReveal>
      )}

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

function GoogleAnalyticsIntegrationCard({ slug, empresaLoading }) {
  const { data, saveData } = useAdminData();
  const toast = useAdminToast();
  const [savedGa4Id, setSavedGa4Id] = useState("");
  const [savedGtmId, setSavedGtmId] = useState("");
  const [draftGa4Id, setDraftGa4Id] = useState("");
  const [draftGtmId, setDraftGtmId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  const applyLoadedAnalytics = useCallback((loja) => {
    setSavedGa4Id(sanitizeGa4MeasurementId(loja?.ga4MeasurementId) || "");
    setSavedGtmId(sanitizeGtmContainerId(loja?.gtmContainerId) || "");
  }, []);

  useEffect(() => {
    if (!slug) {
      queueMicrotask(() => applyLoadedAnalytics(data.loja));
      return;
    }
    getEmpresaBySlug(slug)
      .then((empresa) => {
        applyLoadedAnalytics(mergeEmpresaIntoLoja(data.loja, empresa));
      })
      .catch(() => {
        applyLoadedAnalytics(data.loja);
      });
  }, [slug, data.loja, applyLoadedAnalytics]);

  const hasAnalytics = Boolean(savedGa4Id || savedGtmId);

  async function persistAnalytics({ ga4Raw, gtmRaw }) {
    if (!slug) {
      toast.error("Configure o slug da loja em Minha loja.");
      return false;
    }
    const ga4Id = sanitizeGa4MeasurementId(ga4Raw);
    const gtmId = sanitizeGtmContainerId(gtmRaw);
    setSaving(true);
    try {
      await updateEmpresaBySlug(slug, {
        ga4_measurement_id: ga4Id,
        gtm_container_id: gtmId,
      });
      saveData((prev) => ({
        ...prev,
        loja: {
          ...prev.loja,
          ga4MeasurementId: ga4Id || "",
          gtmContainerId: gtmId || "",
        },
      }));
      setSavedGa4Id(ga4Id || "");
      setSavedGtmId(gtmId || "");
      setDraftGa4Id(ga4Id || "");
      setDraftGtmId(gtmId || "");
      setFormOpen(false);
      toast.success(
        ga4Id || gtmId ? "Google Analytics salvo." : "Integração removida.",
      );
      return true;
    } catch (error) {
      toast.error(error?.message || "Erro ao salvar Google Analytics.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    const ga4Id = sanitizeGa4MeasurementId(draftGa4Id);
    const gtmId = sanitizeGtmContainerId(draftGtmId);
    if (!ga4Id && !gtmId) {
      toast.error("Informe um ID GA4 (G-...) e/ou um container GTM (GTM-...).");
      return;
    }
    await persistAnalytics({ ga4Raw: draftGa4Id, gtmRaw: draftGtmId });
  }

  function openForm() {
    setDraftGa4Id(savedGa4Id);
    setDraftGtmId(savedGtmId);
    setFormOpen(true);
  }

  function cancelForm() {
    setDraftGa4Id(savedGa4Id);
    setDraftGtmId(savedGtmId);
    setFormOpen(false);
  }

  return (
    <div className="admin-card admin-store-block-card admin-compact-page-card admin-integration-card">
      <div className="admin-integration-meta-wrap admin-integration-meta-wrap-left">
        <Image
          className="admin-integration-meta-logo admin-integration-ga-logo"
          src="/images/GA4_Logo.webp"
          alt="Google Analytics"
          width={148}
          height={32}
          priority
        />
      </div>

      <div className="admin-delivery-areas-toolbar">
        <p className="admin-help-text admin-delivery-areas-hint">
          Carregado somente no cardápio online. Eventos: page_view, add_to_cart,
          begin_checkout, purchase.
        </p>
        {!hasAnalytics && !formOpen ? (
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={openForm}
          >
            + Conectar GA4 / GTM
          </button>
        ) : null}
      </div>

      {formOpen ? (
        <form
          className="admin-delivery-area-form admin-card"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <h3 className="admin-delivery-area-form-title">
            Google Analytics / Tag Manager
          </h3>
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="ga4-measurement-id">
              ID de medição GA4
            </label>
            <input
              id="ga4-measurement-id"
              className="admin-input"
              placeholder="Ex: G-XXXXXXXXXX"
              value={draftGa4Id}
              onChange={(event) =>
                setDraftGa4Id(event.target.value.toUpperCase())
              }
              disabled={empresaLoading || saving}
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="gtm-container-id">
              Container GTM
            </label>
            <input
              id="gtm-container-id"
              className="admin-input"
              placeholder="Ex: GTM-XXXXXXX"
              value={draftGtmId}
              onChange={(event) =>
                setDraftGtmId(event.target.value.toUpperCase())
              }
              disabled={empresaLoading || saving}
            />
          </div>
          <div className="admin-delivery-area-form-actions">
            <button
              type="button"
              className="admin-btn"
              onClick={cancelForm}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving || empresaLoading}
            >
              Salvar
            </button>
          </div>
        </form>
      ) : null}

      {hasAnalytics && !formOpen ? (
        <div className="admin-sparse-list">
          {savedGa4Id ? (
            <div className="admin-sparse-row">
              <div className="admin-sparse-row-main">
                <span className="admin-sparse-row-code">GA4 {savedGa4Id}</span>
                <span className="admin-sparse-row-sep" aria-hidden="true">
                  ·
                </span>
                <span className="admin-sparse-row-detail">
                  Medição ativa no cardápio
                </span>
              </div>
            </div>
          ) : null}
          {savedGtmId ? (
            <div className="admin-sparse-row">
              <div className="admin-sparse-row-main">
                <span className="admin-sparse-row-code">GTM {savedGtmId}</span>
                <span className="admin-sparse-row-sep" aria-hidden="true">
                  ·
                </span>
                <span className="admin-sparse-row-detail">
                  Container ativo no cardápio
                </span>
              </div>
            </div>
          ) : null}
          <div className="admin-sparse-row-actions admin-integration-analytics-actions">
            <button type="button" className="admin-link-btn" onClick={openForm}>
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
      ) : null}

      {!hasAnalytics && !formOpen ? (
        <p className="admin-help-text admin-delivery-areas-empty">
          Nenhuma integração Google conectada.
        </p>
      ) : null}

      <AdminConfirmDialog
        open={removeConfirmOpen}
        title="Remover GA4 / GTM"
        message="O rastreamento Google deixará de funcionar no cardápio até conectar novamente. Deseja remover?"
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        danger
        onCancel={() => setRemoveConfirmOpen(false)}
        onConfirm={() => {
          setRemoveConfirmOpen(false);
          void persistAnalytics({ ga4Raw: "", gtmRaw: "" });
        }}
      />
    </div>
  );
}
