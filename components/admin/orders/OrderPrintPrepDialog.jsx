'use client';

export default function OrderPrintPrepDialog({ open, orderId, onConfirm, onSkip }) {
  if (!open) return null;

  return (
    <div
      className="admin-confirm-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onSkip?.();
      }}
    >
      <div className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="order-print-prep-title">
        <h3 id="order-print-prep-title">Imprimir comanda?</h3>
        <p className="admin-help-text">
          O pedido {orderId ? `#${orderId}` : ''} foi movido para preparo. Deseja imprimir a comanda agora?
        </p>
        <div className="admin-confirm-actions">
          <button type="button" className="admin-btn" onClick={onSkip}>
            Agora não
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={onConfirm}>
            Imprimir comanda
          </button>
        </div>
      </div>
    </div>
  );
}
