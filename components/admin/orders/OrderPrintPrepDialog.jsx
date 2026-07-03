'use client';

import { useEffect, useRef } from 'react';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';

export default function OrderPrintPrepDialog({ open, orderId, onConfirm, onSkip }) {
  const confirmRef = useRef(null);
  const { overlayPointerDown, overlayClick } = useAdminOverlayClose({
    onClose: onSkip,
    isDirty: false,
  });

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => {
      confirmRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="admin-confirm-overlay admin-light-modal-overlay"
      role="presentation"
      onPointerDown={overlayPointerDown}
      onClick={overlayClick}
    >
      <div
        className="admin-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-print-prep-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="order-print-prep-title">Imprimir comanda?</h3>
        <p>
          O pedido {orderId ? `#${orderId}` : ''} foi movido para preparo. Deseja imprimir a comanda agora?
        </p>
        <div className="admin-confirm-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onSkip}>
            Agora não
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={onConfirm}
          >
            Imprimir comanda
          </button>
        </div>
      </div>
    </div>
  );
}
