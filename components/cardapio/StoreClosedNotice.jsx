'use client';

import { useCardapio } from '@/context/CardapioContext';
import { IconClose } from './icons';

export default function StoreClosedNotice() {
  const { storeClosedNoticeOpen, closeStoreClosedNotice } = useCardapio();

  const handleOverlayClick = (e) => {
    if (e.target.id === 'storeClosedOverlay') closeStoreClosedNotice();
  };

  return (
    <div
      className={`generic-overlay ${storeClosedNoticeOpen ? 'open' : ''}`}
      id="storeClosedOverlay"
      onClick={handleOverlayClick}
    >
      <div className="modal-card app-dialog-card" role="dialog" aria-modal="true">
        <div className="modal-topbar">
          <div style={{ width: 30 }} />
          <div className="modal-topbar-title">Loja fechada</div>
          <button type="button" className="modal-close" onClick={closeStoreClosedNotice} aria-label="Fechar">
            <IconClose />
          </button>
        </div>
        <div className="modal-body">
          <p className="store-closed-notice-title">Loja fechada no momento.</p>
          <p className="store-closed-notice-sub">
            Você pode visualizar os produtos, mas não poderá efetuar um pedido.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-modal-confirm" onClick={closeStoreClosedNotice}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
