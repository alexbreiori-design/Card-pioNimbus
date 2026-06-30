'use client';

import { useEffect, useState } from 'react';
import { formatReviewDate } from '@/lib/cardapioV2Reviews';
import { V2Icon } from './CardapioV2Icons';
import { StarRatingDisplay } from './CardapioReviewStars';

export default function CardapioReviewViewModal({ open, reviews = [], initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) setIndex(initialIndex);
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'ArrowLeft') setIndex((current) => Math.max(0, current - 1));
      if (event.key === 'ArrowRight') {
        setIndex((current) => Math.min(reviews.length - 1, current + 1));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, reviews.length]);

  if (!open || !reviews.length) return null;

  const review = reviews[index];
  const hasPrev = index > 0;
  const hasNext = index < reviews.length - 1;

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
        className="cardapio-v2-modal cardapio-v2-modal--review-view"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cardapio-v2-review-view-title"
      >
        <div className="cardapio-v2-modal-head">
          <h3 id="cardapio-v2-review-view-title" className="cardapio-v2-modal-title">
            Avaliação de {review.nome}
          </h3>
          <button type="button" className="cardapio-v2-modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="cardapio-v2-modal-body cardapio-v2-review-view-body">
          <div className="cardapio-v2-review-view-meta">
            <StarRatingDisplay value={review.nota} size="md" />
            {review.criadoEm ? (
              <span className="cardapio-v2-review-view-date">{formatReviewDate(review.criadoEm)}</span>
            ) : null}
          </div>
          <p className="cardapio-v2-review-view-text">{review.comentario}</p>
        </div>

        <div className="cardapio-v2-review-view-nav">
          <button
            type="button"
            className="cardapio-v2-review-view-nav-btn"
            onClick={() => setIndex((current) => current - 1)}
            disabled={!hasPrev}
            aria-label="Avaliação anterior"
          >
            <V2Icon name="caret-left" />
          </button>
          <span className="cardapio-v2-review-view-counter">
            {index + 1} / {reviews.length}
          </span>
          <button
            type="button"
            className="cardapio-v2-review-view-nav-btn"
            onClick={() => setIndex((current) => current + 1)}
            disabled={!hasNext}
            aria-label="Próxima avaliação"
          >
            <V2Icon name="caret-right" />
          </button>
        </div>
      </div>
    </div>
  );
}
