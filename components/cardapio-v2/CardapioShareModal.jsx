'use client';

import { useEffect, useState } from 'react';
import { V2Icon } from './CardapioV2Icons';

function buildWhatsAppShareUrl(title, url) {
  const text = title ? `${title} — ${url}` : url;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export default function CardapioShareModal({ open, onClose, title, url }) {
  const [copied, setCopied] = useState(false);
  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (!open) {
      setCopied(false);
      return undefined;
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleCopy() {
    if (!url || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  async function handleNativeShare() {
    if (!canNativeShare) return;
    try {
      await navigator.share({ title: title || 'Cardápio', url });
      onClose?.();
    } catch {
      /* cancelado */
    }
  }

  function handleWhatsApp() {
    if (!url) return;
    window.open(buildWhatsAppShareUrl(title, url), '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      className="cardapio-v2-modal-overlay cardapio-v2-share-modal-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="cardapio-v2-modal cardapio-v2-share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cardapio-v2-share-title"
      >
        <div className="cardapio-v2-modal-head">
          <h3 id="cardapio-v2-share-title" className="cardapio-v2-modal-title">
            Compartilhar cardápio
          </h3>
          <button type="button" className="cardapio-v2-modal-close" onClick={onClose} aria-label="Fechar">
            <V2Icon name="x" />
          </button>
        </div>

        <div className="cardapio-v2-modal-body cardapio-v2-share-modal-body">
          <p className="cardapio-v2-share-modal-hint">Envie o link do cardápio para clientes e campanhas.</p>
          <div className="cardapio-v2-share-modal-url" title={url}>
            {url}
          </div>
        </div>

        <div className="cardapio-v2-share-modal-actions">
          <button type="button" className="cardapio-v2-share-modal-btn" onClick={handleCopy}>
            <V2Icon name="copy" />
            <span>{copied ? 'Link copiado!' : 'Copiar link'}</span>
          </button>
          <button type="button" className="cardapio-v2-share-modal-btn" onClick={handleWhatsApp}>
            <V2Icon name="whatsapp" />
            <span>WhatsApp</span>
          </button>
          {canNativeShare ? (
            <button type="button" className="cardapio-v2-share-modal-btn" onClick={handleNativeShare}>
              <V2Icon name="share" />
              <span>Compartilhar</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
