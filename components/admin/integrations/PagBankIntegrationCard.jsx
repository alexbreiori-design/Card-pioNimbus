'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import { useAdminToast } from '@/context/AdminToastContext';
import { isModelStoreSlug } from '@/lib/superAdmin/modelStore';
import {
  isPagBankPubliclyEnabled,
  readPagBankPreviewUnlocked,
  writePagBankPreviewUnlocked,
} from '@/lib/payments/pagbankGate';

const UNLOCK_CLICKS = 5;

export default function PagBankIntegrationCard({
  slug,
  empresaLoading,
  onConnectedChange,
  locked = false,
}) {
  const toast = useAdminToast();
  const [account, setAccount] = useState(null);
  const [platformSandbox, setPlatformSandbox] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [previewUnlocked, setPreviewUnlocked] = useState(false);
  const [unlockClicks, setUnlockClicks] = useState(0);

  const isModel = isModelStoreSlug(slug);
  const publiclyEnabled = isPagBankPubliclyEnabled();
  const gated = !publiclyEnabled;
  const canOperate = publiclyEnabled || (isModel && previewUnlocked);

  const loadAccount = useCallback(async () => {
    if (!slug) return;
    try {
      const response = await fetch(
        `/api/admin/payments/account?slug=${encodeURIComponent(slug)}`,
        { cache: 'no-store' }
      );
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        throw new Error(json.error || 'Erro ao carregar integração.');
      }
      setPlatformSandbox(json.pagbankPlatformSandbox !== false);
      const next = json.account?.provider === 'pagbank' ? json.account : null;
      setAccount(next);
      if (next?.status === 'ativo') onConnectedChange?.(true);
    } catch (error) {
      toast.error(error?.message || 'Erro ao carregar PagBank.');
    } finally {
      setLoading(false);
    }
  }, [slug, toast, onConnectedChange]);

  useEffect(() => {
    queueMicrotask(() => {
      setPreviewUnlocked(isModel && readPagBankPreviewUnlocked());
    });
  }, [isModel]);

  useEffect(() => {
    queueMicrotask(() => void loadAccount());
  }, [loadAccount]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const status = url.searchParams.get('payments');
    const provider = url.searchParams.get('provider');
    if (!status || provider !== 'pagbank') return;
    if (status === 'connected') {
      toast.success('PagBank conectado com sucesso.');
    } else {
      toast.error(
        url.searchParams.get('message') || 'Não foi possível conectar o PagBank.'
      );
    }
    url.searchParams.delete('payments');
    url.searchParams.delete('message');
    url.searchParams.delete('provider');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    queueMicrotask(() => void loadAccount());
  }, [loadAccount, toast]);

  function handleComingSoonBadgeClick() {
    if (!isModel || publiclyEnabled || previewUnlocked) return;
    const next = unlockClicks + 1;
    if (next >= UNLOCK_CLICKS) {
      writePagBankPreviewUnlocked(true);
      setPreviewUnlocked(true);
      setUnlockClicks(0);
      toast.success('Prévia PagBank liberada nesta loja modelo.');
      return;
    }
    setUnlockClicks(next);
  }

  function lockPreviewAgain() {
    writePagBankPreviewUnlocked(false);
    setPreviewUnlocked(false);
    setUnlockClicks(0);
    toast.success('Prévia PagBank bloqueada de novo.');
  }

  function connectOAuth() {
    if (!slug) {
      toast.error('Configure o slug da loja antes de conectar.');
      return;
    }
    if (!canOperate) {
      toast.error('PagBank ainda não está disponível.');
      return;
    }
    window.location.assign(
      `/api/pagamentos/oauth/pagbank?slug=${encodeURIComponent(slug)}`
    );
  }

  async function disconnect() {
    setDisconnectOpen(false);
    setSaving(true);
    try {
      const response = await fetch('/api/admin/payments/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, provider: 'pagbank' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Erro ao desconectar.');
      }
      setAccount(null);
      onConnectedChange?.(false);
      toast.success('PagBank desconectado.');
    } catch (error) {
      toast.error(error?.message || 'Erro ao desconectar PagBank.');
    } finally {
      setSaving(false);
    }
  }

  const connected = account?.status === 'ativo';
  const showComingSoonShell = gated && !canOperate && !connected;

  return (
    <div
      className={`admin-card admin-store-block-card admin-compact-page-card admin-integration-card admin-payment-provider-card${
        showComingSoonShell ? ' is-coming-soon is-locked' : ''
      }${locked && !connected ? ' is-locked' : ''}`}
      aria-disabled={(locked && !connected) || showComingSoonShell ? true : undefined}
    >
      <div className="admin-integration-meta-wrap admin-integration-meta-wrap-left">
        <Image
          className="admin-payment-provider-logo"
          src="/images/PagBank-logo.png"
          alt="PagBank"
          width={180}
          height={48}
          priority
        />
        {gated ? (
          <button
            type="button"
            className="admin-payment-status admin-payment-status-coming-soon"
            onClick={handleComingSoonBadgeClick}
            title={
              isModel && !previewUnlocked
                ? 'Prévia: clique várias vezes para liberar teste nesta loja'
                : undefined
            }
          >
            Em breve
          </button>
        ) : (
          <span
            className={`admin-payment-status ${
              connected ? 'is-connected' : locked ? 'is-unavailable' : ''
            }`}
          >
            {connected
              ? account?.liveMode === false
                ? 'Conectado (teste)'
                : 'Conectado'
              : locked
                ? 'Indisponível'
                : 'Não conectado'}
          </span>
        )}
      </div>

      {showComingSoonShell ? (
        <>
          <p className="admin-help-text admin-delivery-areas-hint">
            Pix e cartão com recebimento direto na sua conta PagBank.
          </p>
          <p className="admin-help-text admin-delivery-areas-empty">
            Esta integração será disponibilizada após a homologação do PagBank.
          </p>
        </>
      ) : !connected ? (
        <>
          <p className="admin-help-text admin-delivery-areas-hint">
            Pix e cartão com recebimento direto na sua conta PagBank.
          </p>
          {gated && isModel && previewUnlocked ? (
            <p className="admin-help-text admin-delivery-areas-empty">
              Prévia ativa só nesta loja modelo. Clientes ainda veem “Em breve”.
            </p>
          ) : null}
          {locked ? (
            <p className="admin-help-text admin-delivery-areas-empty">
              Outro provedor já está conectado. Desconecte-o para liberar o PagBank.
            </p>
          ) : (
            <div className="admin-delivery-area-form-actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={connectOAuth}
                disabled={loading || empresaLoading || !canOperate}
              >
                {platformSandbox ? 'Conectar (teste)' : 'Conectar'}
              </button>
              {gated && isModel && previewUnlocked ? (
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  onClick={lockPreviewAgain}
                  disabled={saving}
                >
                  Bloquear prévia
                </button>
              ) : null}
            </div>
          )}
        </>
      ) : (
        <div className="admin-payment-methods">
          <p className="admin-help-text admin-delivery-areas-hint" style={{ margin: 0, flex: 1 }}>
            Pix e cartão online ativos no cardápio.
            {gated ? ' (Prévia — tag Em breve permanece para as demais lojas.)' : ''}
          </p>
          <button
            type="button"
            className="admin-btn admin-btn-danger"
            onClick={() => setDisconnectOpen(true)}
            disabled={saving}
          >
            Desconectar
          </button>
          {gated && isModel && previewUnlocked ? (
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              onClick={lockPreviewAgain}
              disabled={saving}
            >
              Bloquear prévia
            </button>
          ) : null}
        </div>
      )}

      <AdminConfirmDialog
        open={disconnectOpen}
        title="Desconectar PagBank"
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
