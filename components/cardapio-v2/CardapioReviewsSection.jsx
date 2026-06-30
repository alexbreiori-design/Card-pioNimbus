'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCardapio } from '@/context/CardapioContext';
import {
  buildReviewStats,
  getApprovedReviews,
  isReviewsEnabledOnCardapio,
  truncateReviewLine,
} from '@/lib/cardapioV2Reviews';
import { V2Icon } from './CardapioV2Icons';
import { StarRatingDisplay } from './CardapioReviewStars';
import CardapioReviewSubmitModal from './CardapioReviewSubmitModal';
import CardapioReviewSuccessModal from './CardapioReviewSuccessModal';
import CardapioReviewViewModal from './CardapioReviewViewModal';
import { CARDAPIO_V2_SECTION } from './cardapioV2Sections';

const PREVIEW_LIMIT = 3;

export default function CardapioReviewsSection() {
  const { storeConfig } = useCardapio();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewIndex, setViewIndex] = useState(0);

  const reviewsEnabled = isReviewsEnabledOnCardapio(storeConfig);

  const reviews = useMemo(
    () => getApprovedReviews(storeConfig?.avaliacoes),
    [storeConfig?.avaliacoes]
  );
  const stats = useMemo(() => buildReviewStats(reviews), [reviews]);
  const previewReviews = reviews.slice(0, PREVIEW_LIMIT);

  useEffect(() => {
    if (!reviewsEnabled) return undefined;
    function openSubmitModal() {
      setSubmitOpen(true);
    }
    window.addEventListener('cardapio-v2-open-review-submit', openSubmitModal);
    return () => window.removeEventListener('cardapio-v2-open-review-submit', openSubmitModal);
  }, [reviewsEnabled]);

  function openReview(reviewId) {
    const index = reviews.findIndex((review) => review.id === reviewId);
    setViewIndex(index >= 0 ? index : 0);
    setViewOpen(true);
  }

  if (!reviewsEnabled) return null;

  return (
    <>
      <section
        className="cardapio-v2-reviews"
        id={CARDAPIO_V2_SECTION.avaliacoes}
        aria-label="Avaliações"
      >
        <div className="cardapio-v2-reviews-head">
          <h2 className="cardapio-v2-reviews-title">Avaliações</h2>
        </div>

        <div className="cardapio-v2-reviews-grid">
          <div className="cardapio-v2-reviews-block cardapio-v2-reviews-block--summary">
            <div className="cardapio-v2-reviews-summary-inner">
              <div className="cardapio-v2-reviews-score">
                <span className="cardapio-v2-reviews-score-value">{stats.averageLabel}</span>
                <StarRatingDisplay value={stats.average} size="lg" />
                <span className="cardapio-v2-reviews-score-count">
                  {stats.count
                    ? `${stats.count} ${stats.count === 1 ? 'avaliação' : 'avaliações'}`
                    : 'Sem avaliações ainda'}
                </span>
              </div>

              <div className="cardapio-v2-reviews-bars" aria-label="Distribuição das notas">
                {stats.distribution.map((row) => (
                  <div key={row.star} className="cardapio-v2-reviews-bar-row">
                    <span className="cardapio-v2-reviews-bar-label">{row.star}</span>
                    <V2Icon name="star" fill className="cardapio-v2-reviews-bar-star" />
                    <div className="cardapio-v2-reviews-bar-track">
                      <span
                        className="cardapio-v2-reviews-bar-fill"
                        style={{ width: `${row.percent}%` }}
                      />
                    </div>
                    <span className="cardapio-v2-reviews-bar-count">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="cardapio-v2-reviews-block cardapio-v2-reviews-block--list">
            {previewReviews.length ? (
              <ul className="cardapio-v2-reviews-preview-list">
                {previewReviews.map((review) => (
                  <li key={review.id}>
                    <button
                      type="button"
                      className="cardapio-v2-reviews-preview-item"
                      onClick={() => openReview(review.id)}
                    >
                      <div className="cardapio-v2-reviews-preview-top">
                        <span className="cardapio-v2-reviews-preview-name">{review.nome}</span>
                        <StarRatingDisplay value={review.nota} size="sm" />
                      </div>
                      {review.comentario ? (
                        <span className="cardapio-v2-reviews-preview-text">
                          {truncateReviewLine(review.comentario)}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="cardapio-v2-reviews-empty-inline">
                <p>Nenhuma avaliação publicada ainda.</p>
              </div>
            )}

            <button
              type="button"
              className="cardapio-v2-reviews-btn"
              onClick={() => setSubmitOpen(true)}
            >
              <V2Icon name="star" className="cardapio-v2-reviews-btn-icon" />
              Deixar avaliação
            </button>
          </div>
        </div>
      </section>

      <CardapioReviewSubmitModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSuccess={() => setSuccessOpen(true)}
      />
      <CardapioReviewSuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} />
      <CardapioReviewViewModal
        open={viewOpen}
        reviews={reviews}
        initialIndex={viewIndex}
        onClose={() => setViewOpen(false)}
      />
    </>
  );
}
