'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminData } from '@/hooks/useAdminData';
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import {
  NIMBUS_FEEDBACK_CATEGORIES,
  withWhatsAppPrefill,
} from '@/lib/nimbusFeedback';
import { NIMBUS_SUPPORT_URL } from '@/lib/nimbusSupport';

const MIN_MESSAGE = 12;

export default function AdminFeedbackModal({ open, onClose, supportUrl = NIMBUS_SUPPORT_URL }) {
  const { data, activeSlug } = useAdminData();
  const toast = useAdminToast();
  const [categoria, setCategoria] = useState('sugestao');
  const [mensagem, setMensagem] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const selected = useMemo(
    () => NIMBUS_FEEDBACK_CATEGORIES.find((item) => item.id === categoria) || NIMBUS_FEEDBACK_CATEGORIES[0],
    [categoria]
  );
  const isWhatsApp = selected?.channel === 'whatsapp';
  const storeName = data?.loja?.nome || activeSlug || 'Minha loja';

  useEffect(() => {
    if (!open) return;
    setCategoria('sugestao');
    setMensagem('');
    setSending(false);
    setSent(false);
  }, [open]);

  const { overlayPointerDown, overlayClick, requestClose } = useAdminOverlayClose({
    onClose,
    isDirty: Boolean(mensagem.trim()) && !sent && !isWhatsApp,
  });

  async function handleSubmit(event) {
    event.preventDefault();
    if (isWhatsApp) {
      const prefill = `Olá! Sou da loja ${storeName}.`;
      const url = withWhatsAppPrefill(supportUrl, prefill) || supportUrl;
      window.open(url, '_blank', 'noopener,noreferrer');
      onClose?.();
      return;
    }

    const text = mensagem.trim();
    if (text.length < MIN_MESSAGE) {
      toast.error(`Escreva pelo menos ${MIN_MESSAGE} caracteres pra gente entender bem.`);
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: activeSlug,
          categoria,
          mensagem: text,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível enviar.');
      }
      setSent(true);
      toast.success('Mensagem enviada. Obrigado pelo retorno!');
    } catch (error) {
      toast.error(error?.message || 'Erro ao enviar feedback.');
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="admin-confirm-overlay"
      role="presentation"
      onPointerDown={overlayPointerDown}
      onClick={overlayClick}
    >
      <div
        className="admin-confirm-modal admin-feedback-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-feedback-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-feedback-modal-head">
          <div>
            <p className="admin-feedback-kicker">Canal Nimbus</p>
            <h3 id="admin-feedback-title">Fale conosco</h3>
            <p className="admin-order-meta">
              Sugestão, problema ou suporte — o canal certo pra cada caso.
            </p>
          </div>
          <button
            type="button"
            className="admin-feedback-close-btn"
            onClick={requestClose}
            aria-label="Fechar"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                d="M6.5 6.5l11 11M17.5 6.5l-11 11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {sent ? (
          <div className="admin-feedback-success">
            <div className="admin-feedback-success-mark" aria-hidden="true">
              ✓
            </div>
            <strong>Recebemos sua mensagem</strong>
            <p className="admin-order-meta">
              Ela fica registrada na sua loja e a equipe Nimbus acompanha por aqui.
            </p>
            <button type="button" className="admin-btn admin-btn-primary" onClick={onClose}>
              Pronto
            </button>
          </div>
        ) : (
          <form
            className={`admin-feedback-form${isWhatsApp ? ' is-support' : ''}`}
            onSubmit={handleSubmit}
          >
            <fieldset className="admin-feedback-categories">
              <legend className="admin-label">Sobre o que você quer falar?</legend>
              <div className="admin-feedback-category-grid" role="radiogroup" aria-label="Tipo de mensagem">
                {NIMBUS_FEEDBACK_CATEGORIES.map((item) => {
                  const active = categoria === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`admin-feedback-category-card${active ? ' is-active' : ''}${item.channel === 'whatsapp' ? ' is-whatsapp' : ''}`}
                      onClick={() => setCategoria(item.id)}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.hint}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div
              className={`admin-feedback-message-block${isWhatsApp ? ' is-collapsed' : ''}`}
              aria-hidden={isWhatsApp}
            >
              <div className="admin-form-group">
                <label className="admin-label" htmlFor="admin-feedback-message">
                  Conte com detalhes
                </label>
                <textarea
                  id="admin-feedback-message"
                  className="admin-input admin-feedback-textarea"
                  rows={5}
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Descreva o que você precisa, o que aconteceu ou a ideia que teve…"
                  tabIndex={isWhatsApp ? -1 : undefined}
                  disabled={isWhatsApp}
                />
                <span className="admin-order-meta">
                  Mínimo de {MIN_MESSAGE} caracteres · Loja: {storeName}
                </span>
              </div>
            </div>

            <div className={`admin-feedback-actions${isWhatsApp ? ' is-support' : ''}`}>
              <button
                type="submit"
                className={`admin-btn ${isWhatsApp ? 'admin-feedback-whatsapp-btn' : 'admin-btn-primary'}`}
                disabled={sending}
              >
                {sending ? 'Enviando…' : isWhatsApp ? 'Abrir WhatsApp' : 'Enviar mensagem'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
