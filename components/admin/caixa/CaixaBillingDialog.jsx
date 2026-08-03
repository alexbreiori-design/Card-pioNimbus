'use client';

import { useRouter } from 'next/navigation';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import { CAIXA_BILLING_MESSAGES } from '@/lib/stripe/billingGates';

/**
 * Modal central de bloqueio/aviso de carência ao abrir caixa.
 * mode: 'blocked' | 'warning'
 */
export default function CaixaBillingDialog({
  open,
  mode = 'blocked',
  message,
  caption,
  onClose,
  onContinue,
}) {
  const router = useRouter();
  const { overlayPointerDown, overlayClick } = useAdminOverlayClose({
    onClose,
    isDirty: false,
  });

  if (!open) return null;

  const isBlocked = mode === 'blocked';
  const title = isBlocked ? 'Carência encerrada' : 'Aviso de carência';
  const body = message || (isBlocked ? CAIXA_BILLING_MESSAGES.blocked : '');
  const footerCaption = isBlocked
    ? caption || CAIXA_BILLING_MESSAGES.blockedCaption
    : null;

  function handlePrimary() {
    if (isBlocked) {
      onClose?.();
      router.push('/admin/integracoes');
      return;
    }
    onContinue?.();
  }

  return (
    <div
      className="admin-confirm-overlay admin-caixa-billing-overlay"
      role="presentation"
      onPointerDown={overlayPointerDown}
      onClick={overlayClick}
    >
      <div
        className="admin-confirm-modal admin-caixa-billing-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-caixa-billing-title"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <h3 id="admin-caixa-billing-title">{title}</h3>
        <p>{body}</p>
        {footerCaption ? (
          <p className="admin-caixa-billing-caption">{footerCaption}</p>
        ) : null}
        <div className="admin-confirm-actions">
          {isBlocked ? (
            <>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
                Fechar
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={handlePrimary}>
                Corrigir pagamento
              </button>
            </>
          ) : (
            <button type="button" className="admin-btn admin-btn-primary" onClick={handlePrimary}>
              Entendi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
