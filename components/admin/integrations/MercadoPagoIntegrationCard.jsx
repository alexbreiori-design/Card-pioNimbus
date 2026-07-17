"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import { useAdminToast } from "@/context/AdminToastContext";

export default function MercadoPagoIntegrationCard({ slug, empresaLoading }) {
  const toast = useAdminToast();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!slug) return;
    try {
      const response = await fetch(
        `/api/admin/payments/account?slug=${encodeURIComponent(slug)}`,
        { cache: "no-store" },
      );
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok)
        throw new Error(json.error || "Erro ao carregar integração.");
      setAccount(json.account);
    } catch (error) {
      toast.error(error?.message || "Erro ao carregar Mercado Pago.");
    } finally {
      setLoading(false);
    }
  }, [slug, toast]);

  useEffect(() => {
    queueMicrotask(() => void loadAccount());
  }, [loadAccount]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("payments");
    if (!status) return;
    if (status === "connected")
      toast.success("Mercado Pago conectado com sucesso.");
    else
      toast.error(
        url.searchParams.get("message") ||
          "Não foi possível conectar o Mercado Pago.",
      );
    url.searchParams.delete("payments");
    url.searchParams.delete("message");
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    queueMicrotask(() => void loadAccount());
  }, [loadAccount, toast]);

  function connect() {
    if (!slug) {
      toast.error("Configure o slug da loja antes de conectar.");
      return;
    }
    window.location.assign(
      `/api/pagamentos/oauth/mercado_pago?slug=${encodeURIComponent(slug)}`,
    );
  }

  async function disconnect() {
    setDisconnectOpen(false);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/payments/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok)
        throw new Error(json.error || "Erro ao desconectar.");
      setAccount(null);
      toast.success("Mercado Pago desconectado.");
    } catch (error) {
      toast.error(error?.message || "Erro ao desconectar Mercado Pago.");
    } finally {
      setSaving(false);
    }
  }

  async function updateMethod(key, checked) {
    const methods = { ...(account?.methods || {}), [key]: checked };
    if (!methods.pix && !methods.credit_card) {
      toast.error("Mantenha ao menos um método online ativo.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/payments/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, methods }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok)
        throw new Error(json.error || "Erro ao atualizar métodos.");
      setAccount((current) => ({ ...current, methods: json.methods }));
    } catch (error) {
      toast.error(error?.message || "Erro ao atualizar métodos.");
    } finally {
      setSaving(false);
    }
  }

  const connected = account?.status === "ativo";
  return (
    <div className="admin-card admin-store-block-card admin-compact-page-card admin-integration-card admin-payment-provider-card">
      <div className="admin-integration-meta-wrap admin-integration-meta-wrap-left">
        <Image
          className="admin-payment-provider-logo"
          src="/images/mercadopago-logo.png"
          alt="Mercado Pago"
          width={180}
          height={48}
          priority
        />
        <span
          className={`admin-payment-status ${connected ? "is-connected" : ""}`}
        >
          {connected ? "Conectado" : "Não conectado"}
        </span>
      </div>

      <div className="admin-delivery-areas-toolbar">
        <p className="admin-help-text admin-delivery-areas-hint">
          O valor das vendas vai diretamente para a conta Mercado Pago da loja.
        </p>
        {!connected ? (
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={connect}
            disabled={loading || empresaLoading}
          >
            Conectar Mercado Pago
          </button>
        ) : null}
      </div>

      {connected ? (
        <div className="admin-payment-methods">
          <label className="admin-payment-method-toggle">
            <input
              type="checkbox"
              checked={account.methods?.pix !== false}
              onChange={(event) =>
                void updateMethod("pix", event.target.checked)
              }
              disabled={saving}
            />
            <span>Pix online</span>
          </label>
          <label className="admin-payment-method-toggle">
            <input
              type="checkbox"
              checked={account.methods?.credit_card !== false}
              onChange={(event) =>
                void updateMethod("credit_card", event.target.checked)
              }
              disabled={saving}
            />
            <span>Cartão online</span>
          </label>
          <button
            type="button"
            className="admin-link-btn admin-link-btn-danger"
            onClick={() => setDisconnectOpen(true)}
            disabled={saving}
          >
            Desconectar
          </button>
        </div>
      ) : null}

      {!connected && !loading ? (
        <p className="admin-help-text admin-delivery-areas-empty">
          Nenhuma conta Mercado Pago conectada.
        </p>
      ) : null}

      <AdminConfirmDialog
        open={disconnectOpen}
        title="Desconectar Mercado Pago"
        message="O pagamento online deixará de aparecer no cardápio. Deseja desconectar?"
        confirmLabel="Desconectar"
        cancelLabel="Cancelar"
        danger
        onCancel={() => setDisconnectOpen(false)}
        onConfirm={() => void disconnect()}
      />
    </div>
  );
}
