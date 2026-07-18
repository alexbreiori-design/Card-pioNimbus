"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import { useAdminToast } from "@/context/AdminToastContext";

export default function MercadoPagoIntegrationCard({ slug, empresaLoading }) {
  const toast = useAdminToast();
  const [account, setAccount] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [isTestCredentials, setIsTestCredentials] = useState(true);
  const [copiedOrderId, setCopiedOrderId] = useState("");

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
      setRecentOrders(Array.isArray(json.recentOrders) ? json.recentOrders : []);
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

  function connectOAuth() {
    if (!slug) {
      toast.error("Configure o slug da loja antes de conectar.");
      return;
    }
    window.location.assign(
      `/api/pagamentos/oauth/mercado_pago?slug=${encodeURIComponent(slug)}`,
    );
  }

  async function connectWithCredentials(event) {
    event.preventDefault();
    if (!slug) {
      toast.error("Configure o slug da loja antes de conectar.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/payments/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          accessToken: accessToken.trim(),
          publicKey: publicKey.trim(),
          isTestCredentials,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok)
        throw new Error(json.error || "Erro ao salvar credenciais.");
      setAccount(json.account);
      setFormOpen(false);
      setAccessToken("");
      setPublicKey("");
      toast.success(
        isTestCredentials
          ? "Credenciais de teste salvas."
          : "Credenciais salvas.",
      );
    } catch (error) {
      toast.error(error?.message || "Erro ao salvar credenciais.");
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
          {connected
            ? account?.liveMode === false
              ? "Conectado (teste)"
              : "Conectado"
            : "Não conectado"}
        </span>
      </div>

      <div className="admin-delivery-areas-toolbar">
        <p className="admin-help-text admin-delivery-areas-hint">
          <strong>Produção:</strong> use <strong>Conectar via OAuth</strong> para
          cada loja autorizar a própria conta (sem colar Access Token).{' '}
          <strong>Teste:</strong> use credenciais APP_USR do painel. No webhook do
          MP, marque também <strong>Vinculação de aplicações</strong> (mp-connect).
        </p>
      </div>

      {!connected && !formOpen ? (
        <div className="admin-delivery-area-form-actions" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={connectOAuth}
            disabled={loading || empresaLoading}
          >
            Conectar via OAuth
          </button>
          <button
            type="button"
            className="admin-btn"
            onClick={() => setFormOpen(true)}
            disabled={loading || empresaLoading}
          >
            Usar credenciais (teste)
          </button>
        </div>
      ) : null}

      {formOpen && !connected ? (
        <form
          className="admin-delivery-area-form admin-card"
          onSubmit={(event) => void connectWithCredentials(event)}
        >
          <h3 className="admin-delivery-area-form-title">
            Credenciais Mercado Pago
          </h3>
          <label className="admin-payment-method-toggle" style={{ marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={isTestCredentials}
              onChange={(event) => setIsTestCredentials(event.target.checked)}
              disabled={saving}
            />
            <span>São credenciais de teste (sandbox)</span>
          </label>
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="mp-public-key">
              Public Key
            </label>
            <input
              id="mp-public-key"
              className="admin-input"
              value={publicKey}
              onChange={(event) => setPublicKey(event.target.value)}
              placeholder="APP_USR-... ou TEST-..."
              disabled={saving}
              autoComplete="off"
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="mp-access-token">
              Access Token
            </label>
            <input
              id="mp-access-token"
              className="admin-input"
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              placeholder="APP_USR-..."
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
              disabled={saving || !accessToken.trim() || !publicKey.trim()}
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      ) : null}

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

      {connected && recentOrders.length > 0 ? (
        <div className="admin-delivery-areas-toolbar" style={{ marginTop: 16 }}>
          <p className="admin-help-text admin-delivery-areas-hint">
            Últimos Order IDs (Mercado Pago) — use na medição de qualidade:
          </p>
          <ul className="admin-help-text" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {recentOrders.map((row) => (
              <li key={`${row.orderId}-${row.createdAt}`} style={{ marginBottom: 6 }}>
                <code style={{ wordBreak: "break-all" }}>{row.orderId}</code>
                {" · "}
                {row.method === "pix" ? "Pix" : "Cartão"} · {row.status}
                <button
                  type="button"
                  className="admin-link-btn"
                  style={{ marginLeft: 8 }}
                  onClick={async () => {
                    await navigator.clipboard.writeText(row.orderId);
                    setCopiedOrderId(row.orderId);
                    window.setTimeout(() => setCopiedOrderId(""), 2000);
                  }}
                >
                  {copiedOrderId === row.orderId ? "Copiado" : "Copiar"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!connected && !loading && !formOpen ? (
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
