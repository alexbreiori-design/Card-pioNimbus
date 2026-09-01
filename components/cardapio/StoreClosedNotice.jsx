'use client';

import { useCardapio } from '@/context/CardapioContext';
import { getStoreClosedWhatsappOpeningPhrase } from '@/lib/storeHours';
import { IconClose } from './icons';

const DEFAULT_TITLE = 'Loja fechada no momento.';
const DEFAULT_SUB =
  'Você pode visualizar os produtos, mas não poderá efetuar um pedido.';

export default function StoreClosedNotice() {
  const { storeConfig, storeClosedNoticeOpen, closeStoreClosedNotice, checkoutViaWhatsappWhenClosed } =
    useCardapio();

  const handleOverlayClick = (e) => {
    if (e.target.id === 'storeClosedOverlay') closeStoreClosedNotice();
  };

  const customMessage = String(storeConfig?.mensagemLojaFechada || '').trim();
  const customLines = customMessage
    ? customMessage.split(/\n+/).map((line) => line.trim()).filter(Boolean)
    : [];

  const openingPhrase = checkoutViaWhatsappWhenClosed
    ? getStoreClosedWhatsappOpeningPhrase(storeConfig)
    : null;

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
          {checkoutViaWhatsappWhenClosed ? (
            <>
              <p className="store-closed-notice-title">Estamos fechados no momento</p>
              <p className="store-closed-notice-sub">
                Você pode montar seu pedido aqui e enviar pelo WhatsApp da loja.
                {openingPhrase ? (
                  <>
                    {' '}
                    Abrimos {openingPhrase}. Na última etapa, toque em <strong>Enviar pelo WhatsApp</strong>.
                  </>
                ) : (
                  <> Na última etapa, toque em <strong>Enviar pelo WhatsApp</strong>.</>
                )}
              </p>
              {customLines.length > 0
                ? customLines.map((line, index) => (
                    <p key={`${index}-${line.slice(0, 24)}`} className="store-closed-notice-sub">
                      {line}
                    </p>
                  ))
                : null}
            </>
          ) : customLines.length > 0 ? (
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
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
