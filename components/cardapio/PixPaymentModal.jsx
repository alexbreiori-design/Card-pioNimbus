'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function PixPaymentModal({
  open,
  payment,
  sandbox = false,
  cancelling = false,
  onCancel,
  onExpire,
}) {
  const [copied, setCopied] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const expiredNotifiedRef = useRef(false);

  useEffect(() => {
    if (!open || !payment?.expiresAt) {
      expiredNotifiedRef.current = false;
      queueMicrotask(() => setRemainingMs(0));
      return undefined;
    }
    expiredNotifiedRef.current = false;
    const tick = () => {
      const left = new Date(payment.expiresAt).getTime() - Date.now();
      setRemainingMs(left);
      if (left <= 0 && !expiredNotifiedRef.current) {
        expiredNotifiedRef.current = true;
        onExpire?.();
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [open, payment?.expiresAt, onExpire]);

  if (!open || !payment) return null;

  async function copyPix() {
    if (!payment.qrCode) return;
    await navigator.clipboard.writeText(payment.qrCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function copyOrderId() {
    if (!payment.providerOrderId) return;
    await navigator.clipboard.writeText(payment.providerOrderId);
    setCopiedOrderId(true);
    window.setTimeout(() => setCopiedOrderId(false), 2000);
  }

  const expired = remainingMs <= 0 && Boolean(payment.expiresAt);

  return (
    <div
      className="checkout-pix-overlay open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pixPaymentTitle"
    >
      <div className="checkout-pix-modal">
        <h3 id="pixPaymentTitle">Pague com Pix</h3>
        <p className="checkout-pix-timer" aria-live="polite">
          {expired ? 'Tempo esgotado' : `Expira em ${formatCountdown(remainingMs)}`}
        </p>

        {payment.qrCodeBase64 ? (
          <Image
            className="checkout-online-qr"
            src={`data:image/png;base64,${payment.qrCodeBase64}`}
            alt="QR Code Pix"
            width={220}
            height={220}
            unoptimized
          />
        ) : null}

        {payment.qrCode ? (
          <button
            type="button"
            className="btn-copy-pix"
            onClick={() => void copyPix()}
            disabled={cancelling || expired}
          >
            {copied ? 'Código copiado!' : 'Copiar Pix copia e cola'}
          </button>
        ) : null}

        <p className="checkout-pix-waiting">
          Aguardando confirmação do pagamento. Não feche esta tela.
        </p>

        {sandbox && payment.providerOrderId ? (
          <p className="checkout-field-hint checkout-pix-sandbox-id">
            Order ID (teste): <code>{payment.providerOrderId}</code>{' '}
            <button type="button" className="btn-copy-pix btn-copy-pix--inline" onClick={() => void copyOrderId()}>
              {copiedOrderId ? 'Copiado!' : 'Copiar Order ID'}
            </button>
          </p>
        ) : null}

        <button
          type="button"
          className="btn-checkout-cancel-pix"
          onClick={() => void onCancel?.()}
          disabled={cancelling}
        >
          {cancelling ? 'Cancelando…' : 'Cancelar pagamento'}
        </button>
      </div>
    </div>
  );
}
