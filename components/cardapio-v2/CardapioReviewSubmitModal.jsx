'use client';

import { useEffect, useState } from 'react';
import { useCardapio } from '@/context/CardapioContext';
import { StarRatingInput } from './CardapioReviewStars';

export default function CardapioReviewSubmitModal({ open, onClose, onSuccess }) {
  const { storeConfig, profileName, checkoutData } = useCardapio();
  const [nome, setNome] = useState('');
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    const prefill = String(profileName || checkoutData?.name || '').trim();
    setNome(prefill);
    setNota(0);
    setComentario('');
    setErrorMessage('');
  }, [open, profileName, checkoutData?.name]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/public-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: storeConfig?.slug,
          nome,
          nota,
          comentario,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Não foi possível enviar a avaliação.');
      }
      onClose?.();
      onSuccess?.();
    } catch (error) {
      setErrorMessage(error?.message || 'Não foi possível enviar a avaliação.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleOverlayClick(event) {
    if (event.target === event.currentTarget) onClose?.();
  }

  return (
    <div
      className="cardapio-v2-modal-overlay open"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="cardapio-v2-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cardapio-v2-review-submit-title"
      >
        <div className="cardapio-v2-modal-head">
          <h3 id="cardapio-v2-review-submit-title" className="cardapio-v2-modal-title">
            Deixar avaliação
          </h3>
          <button type="button" className="cardapio-v2-modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <form className="cardapio-v2-modal-body" onSubmit={handleSubmit}>
          <p className="cardapio-v2-modal-lead">
            Conte como foi sua experiência com a loja.
          </p>

          <label className="cardapio-v2-modal-field">
            <span className="cardapio-v2-modal-label">Seu nome</span>
            <input
              type="text"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              maxLength={80}
              placeholder="Como podemos te identificar?"
              disabled={submitting}
              required
            />
          </label>

          <div className="cardapio-v2-modal-field">
            <span className="cardapio-v2-modal-label">Sua nota</span>
            <StarRatingInput value={nota} onChange={setNota} disabled={submitting} />
          </div>

          <label className="cardapio-v2-modal-field">
            <span className="cardapio-v2-modal-label">Conte como foi sua experiência</span>
            <textarea
              value={comentario}
              onChange={(event) => setComentario(event.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Atendimento, entrega, sabor..."
              disabled={submitting}
              required
            />
          </label>

          {errorMessage ? (
            <p className="cardapio-v2-modal-feedback is-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="cardapio-v2-modal-actions">
            <button type="button" className="cardapio-v2-modal-btn cardapio-v2-modal-btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="cardapio-v2-modal-btn cardapio-v2-modal-btn--primary"
              disabled={submitting}
            >
              {submitting ? 'Enviando…' : 'Enviar avaliação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
