'use client';

import { useCardapio } from '@/context/CardapioContext';
import { IconClose } from './icons';

const DEFAULT_TITLE = 'Loja fechada no momento.';
const DEFAULT_SUB =
  'Você pode visualizar os produtos, mas não poderá efetuar um pedido.';

export default function StoreClosedNotice() {
  const { storeConfig, storeClosedNoticeOpen, closeStoreClosedNotice } = useCardapio();

  const handleOverlayClick = (e) => {
    if (e.target.id === 'storeClosedOverlay') closeStoreClosedNotice();
  };

  const customMessage = String(storeConfig?.mensagemLojaFechada || '').trim();
  const customLines = customMessage
    ? customMessage.split(/\n+/).map((line) => line.trim()).filter(Boolean)
    : [];

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
          {customLines.length > 0 ? (
            customLines.map((line, index) => (
              <p
                key={`${index}-${line.slice(0, 24)}`}
                className={index === 0 ? 'store-closed-notice-title' : 'store-closed-notice-sub'}
              >
                {line}
              </p>
            ))
          ) : (
            <>
              <p className="store-closed-notice-title">{DEFAULT_TITLE}</p>
              <p className="store-closed-notice-sub">{DEFAULT_SUB}</p>
            </>
          )}
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
