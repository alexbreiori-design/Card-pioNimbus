'use client';

import OrderTicket from './OrderTicket';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import { ORDER_TICKET_SAMPLE_ORDER } from '@/lib/orderTicketSample';

export default function OrderTicketPreviewModal({ open, store, widthMm = 80, onClose, onPrintTest }) {
  const { overlayPointerDown, overlayClick } = useAdminOverlayClose({
    onClose,
    isDirty: false,
  });

  if (!open) return null;

  return (
    <div
      className="admin-confirm-overlay admin-confirm-overlay-top"
      role="presentation"
      onPointerDown={overlayPointerDown}
      onClick={overlayClick}
    >
      <div className="admin-order-ticket-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-order-ticket-preview-head">
          <div>
            <span className="admin-order-detail-kicker">Comanda de teste</span>
            <h2>Preview da impressão</h2>
            <p className="admin-order-ticket-preview-hint">
              Modelo com pedido fictício. Use para ajustar logo e largura antes de imprimir pedidos reais.
            </p>
          </div>
          <button type="button" className="admin-order-detail-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="admin-order-ticket-preview-body">
          <OrderTicket
            order={ORDER_TICKET_SAMPLE_ORDER}
            store={store}
            widthMm={widthMm}
            mode="preview"
          />
        </div>

        <div className="admin-order-ticket-preview-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
            Fechar
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={onPrintTest}>
            Imprimir teste
          </button>
        </div>
      </div>
    </div>
  );
}
