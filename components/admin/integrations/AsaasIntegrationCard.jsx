"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import { useAdminToast } from "@/context/AdminToastContext";
import { getRuntimeEnvironment } from "@/lib/runtimeEnvironment";

const runtimeEnv = getRuntimeEnvironment();
const allowSandboxToggle = runtimeEnv === "local" || runtimeEnv === "staging";

export default function AsaasIntegrationCard({
  slug,
  empresaLoading,
  onConnectedChange,
  locked = false,
}) {
  const toast = useAdminToast();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isSandbox, setIsSandbox] = useState(allowSandboxToggle);

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
      const next = json.account?.provider === "asaas" ? json.account : null;
      setAccount(next);
      if (next?.status === "ativo") onConnectedChange?.(true);
    } catch (error) {
      toast.error(error?.message || "Erro ao carregar Asaas.");
    } finally {
      setLoading(false);
    }
  }, [slug, toast, onConnectedChange]);

  useEffect(() => {
    queueMicrotask(() => void loadAccount());
  }, [loadAccount]);

  async function connectWithApiKey(event) {
    event.preventDefault();
    if (!slug) {
      toast.error("Configure o slug da loja antes de conectar.");
      return;
    }
    if (!apiKey.trim()) {
      toast.error("Informe a API Key do Asaas.");
      return;
    }
    const useSandbox = allowSandboxToggle && isSandbox;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/payments/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          provider: "asaas",
          apiKey: apiKey.trim(),
          isSandbox: useSandbox,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok)
        throw new Error(json.error || "Erro ao salvar API Key.");
      setAccount(json.account);
      onConnectedChange?.(true);
      setFormOpen(false);
      setApiKey("");
      toast.success(useSandbox ? "Asaas (sandbox) conectado." : "Asaas conectado.");
    } catch (error) {
      toast.error(error?.message || "Erro ao conectar Asaas.");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    setDisconnectOpen(false);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/payments/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, provider: "asaas" }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok)
        throw new Error(json.error || "Erro ao desconectar.");
      setAccount(null);
      onConnectedChange?.(false);
      toast.success("Asaas desconectado.");
    } catch (error) {
      toast.error(error?.message || "Erro ao desconectar Asaas.");
    } finally {
      setSaving(false);
    }
  }

  const connected = account?.status === "ativo";
  const showSandboxStatus = allowSandboxToggle && account?.liveMode === false;

  return (
    <div
      className={`admin-card admin-store-block-card admin-compact-page-card admin-integration-card admin-payment-provider-card${
        locked && !connected ? " is-locked" : ""
      }`}
      aria-disabled={locked && !connected ? true : undefined}
    >
      <div className="admin-integration-meta-wrap admin-integration-meta-wrap-left">
        <Image
          className="admin-payment-provider-logo"
          src="/images/asaas-logo.png"
          alt="Asaas"
          width={180}
          height={48}
          priority
        />
        <span
          className={`admin-payment-status ${
            connected ? "is-connected" : locked ? "is-unavailable" : ""
          }`}
        >
          {connected
            ? showSandboxStatus
              ? "Conectado (sandbox)"
              : "Conectado"
            : locked
              ? "Indisponível"
              : "Não conectado"}
        </span>
      </div>

      {!connected && !formOpen ? (
        <>
          <p className="admin-help-text admin-delivery-areas-hint">
            Pix e cartão com recebimento pela sua conta Asaas.
          </p>
          {locked ? (
            <p className="admin-help-text admin-delivery-areas-empty">
              Outro provedor já está conectado. Desconecte-o para liberar o Asaas.
            </p>
          ) : (
            <div className="admin-delivery-area-form-actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => setFormOpen(true)}
                disabled={loading || empresaLoading}
              >
                Conectar
              </button>
            </div>
          )}
        </>
      ) : null}

      {!locked && formOpen && !connected ? (
        <form
          className="admin-delivery-area-form admin-card"
          onSubmit={(event) => void connectWithApiKey(event)}
        >
          <h3 className="admin-delivery-area-form-title">API Key Asaas</h3>
          <p className="admin-help-text" style={{ marginTop: 0 }}>
            No painel Asaas: Integrações → API Key. Cole a chave aqui.
          </p>
          {allowSandboxToggle ? (
            <label className="admin-payment-method-toggle" style={{ marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={isSandbox}
                onChange={(event) => setIsSandbox(event.target.checked)}
                disabled={saving}
              />
              <span>Ambiente sandbox (teste)</span>
            </label>
          ) : null}
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="asaas-api-key">
              API Key
            </label>
            <input
              id="asaas-api-key"
              className="admin-input"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="$aact_..."
              disabled={saving}
              autoComplete="off"
            />
          </div>
          <div className="admin-delivery-area-form-actions">
            <button
              type="button"
              className="admin-btn"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving || !apiKey.trim()}
            >
              {saving ? "Conectando…" : "Salvar"}
            </button>
          </div>
        </form>
      ) : null}

      {connected ? (
        <div className="admin-payment-methods">
          <p
            className="admin-help-text admin-delivery-areas-hint"
            style={{ margin: 0, flex: 1 }}
          >
            Pix e cartão online ativos no cardápio.
          </p>
          <button
            type="button"
            className="admin-btn admin-btn-danger"
            onClick={() => setDisconnectOpen(true)}
            disabled={saving}
          >
            Desconectar
          </button>
        </div>
      ) : null}

      <AdminConfirmDialog
        open={disconnectOpen}
        title="Desconectar Asaas"
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
