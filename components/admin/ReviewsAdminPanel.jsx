'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminData } from '@/hooks/useAdminData';
import { useAdminToast } from '@/context/AdminToastContext';
import {
  REVIEW_STATUS,
  buildReviewStats,
  filterAdminReviews,
  formatReviewDate,
  getApprovedReviews,
  getPendingReviews,
  paginateItems,
  setReviewStatus,
} from '@/lib/reviews/storeReviews';

const PAGE_SIZE = 5;

const STATUS_FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: REVIEW_STATUS.PENDENTE, label: 'Pendentes' },
  { key: REVIEW_STATUS.APROVADA, label: 'Publicadas' },
  { key: REVIEW_STATUS.REJEITADA, label: 'Rejeitadas' },
];

const STAR_FILTERS = [
  { key: 'all', label: 'Todas as notas' },
  { key: '5', label: '5 estrelas' },
  { key: '4', label: '4 estrelas' },
  { key: '3', label: '3 estrelas' },
  { key: '2', label: '2 estrelas' },
  { key: '1', label: '1 estrela' },
];

function ReviewStatusBadge({ status }) {
  const label =
    status === REVIEW_STATUS.PENDENTE
      ? 'Pendente'
      : status === REVIEW_STATUS.REJEITADA
        ? 'Rejeitada'
        : 'Publicada';
  return <span className={`admin-review-status admin-review-status--${status}`}>{label}</span>;
}

function StarText({ value }) {
  return <span className="admin-review-stars" aria-label={`${value} de 5 estrelas`}>{'★'.repeat(value)}{'☆'.repeat(5 - value)}</span>;
}

export default function ReviewsAdminPanel() {
  const { data, saveData, saving } = useAdminData();
  const toast = useAdminToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [starsFilter, setStarsFilter] = useState('all');
  const [page, setPage] = useState(0);

  const pendingCount = useMemo(() => getPendingReviews(data?.loja?.avaliacoes).length, [data?.loja?.avaliacoes]);
  const approvedCount = useMemo(() => getApprovedReviews(data?.loja?.avaliacoes).length, [data?.loja?.avaliacoes]);
  const approvedStats = useMemo(() => buildReviewStats(getApprovedReviews(data?.loja?.avaliacoes)), [data?.loja?.avaliacoes]);

  const filteredReviews = useMemo(
    () => filterAdminReviews(data?.loja?.avaliacoes, { status: statusFilter, stars: starsFilter }),
    [data?.loja?.avaliacoes, statusFilter, starsFilter]
  );

  const pagination = useMemo(
    () => paginateItems(filteredReviews, page, PAGE_SIZE),
    [filteredReviews, page]
  );

  useEffect(() => {
    setPage(0);
  }, [statusFilter, starsFilter]);

  useEffect(() => {
    if (page > pagination.totalPages - 1) {
      setPage(Math.max(0, pagination.totalPages - 1));
    }
  }, [page, pagination.totalPages]);

  const reviewsEnabled = data?.loja?.exibirAvaliacoesCardapio !== false;

  async function toggleReviewsOnCardapio(checked) {
    try {
      await saveData((prev) => ({
        ...prev,
        loja: {
          ...prev.loja,
          exibirAvaliacoesCardapio: checked,
        },
      }));
      toast.success(checked ? 'Avaliações ativadas no cardápio.' : 'Avaliações ocultas no cardápio.');
    } catch {
      toast.error('Não foi possível atualizar a configuração.');
    }
  }

  async function updateReviewStatus(reviewId, status) {
    try {
      await saveData((prev) => ({
        ...prev,
        loja: {
          ...prev.loja,
          avaliacoes: setReviewStatus(prev.loja?.avaliacoes, reviewId, status),
        },
      }));
      toast.success(
        status === REVIEW_STATUS.APROVADA
          ? 'Avaliação publicada no cardápio.'
          : status === REVIEW_STATUS.REJEITADA
            ? 'Avaliação rejeitada.'
            : 'Avaliação atualizada.'
      );
    } catch {
      toast.error('Não foi possível atualizar a avaliação.');
    }
  }

  return (
    <div className="admin-card admin-reviews-page-card">
      <div className="admin-reviews-toolbar">
        <div className="admin-reviews-enable-row">
          <div>
            <strong className="admin-reviews-enable-title">Exibir avaliações no cardápio</strong>
            <p className="admin-help-text admin-reviews-enable-hint">
              Desativado, a seção de avaliações some do cardápio online.
            </p>
          </div>
          <label className="admin-switch" htmlFor="exibir-avaliacoes-cardapio">
            <input
              id="exibir-avaliacoes-cardapio"
              type="checkbox"
              checked={reviewsEnabled}
              disabled={saving}
              onChange={(event) => toggleReviewsOnCardapio(event.target.checked)}
            />
            <span className="admin-switch-slider" />
          </label>
        </div>

        <div className="admin-reviews-stats-row">
          <span className="admin-reviews-stat-chip">{pendingCount} pendentes</span>
          <span className="admin-reviews-stat-chip">{approvedCount} publicadas</span>
          <span className="admin-reviews-stat-chip">Média {approvedStats.averageLabel}</span>
        </div>
      </div>

      <div className="admin-reviews-filters">
        <div className="admin-reviews-filter-group">
          <span className="admin-reviews-filter-label">Status</span>
          <div className="admin-reviews-filter-pills">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`admin-reviews-filter-pill${statusFilter === filter.key ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-reviews-filter-group">
          <span className="admin-reviews-filter-label">Nota</span>
          <div className="admin-reviews-filter-pills">
            {STAR_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`admin-reviews-filter-pill${starsFilter === filter.key ? ' is-active' : ''}`}
                onClick={() => setStarsFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-reviews-table-wrap">
        {pagination.items.length ? (
          <ul className="admin-reviews-table">
            {pagination.items.map((review) => (
              <li key={review.id} className="admin-reviews-table-row">
                <div className="admin-reviews-table-main">
                  <div className="admin-reviews-table-head">
                    <strong>{review.nome}</strong>
                    <ReviewStatusBadge status={review.status} />
                  </div>
                  <div className="admin-reviews-table-meta">
                    <StarText value={review.nota} />
                    {review.criadoEm ? <span>{formatReviewDate(review.criadoEm)}</span> : null}
                  </div>
                  <p className="admin-reviews-table-text">{review.comentario}</p>
                </div>

                <div className="admin-reviews-table-actions">
                  {review.status === REVIEW_STATUS.PENDENTE ? (
                    <>
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary admin-btn-sm"
                        disabled={saving}
                        onClick={() => updateReviewStatus(review.id, REVIEW_STATUS.APROVADA)}
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost admin-btn-sm"
                        disabled={saving}
                        onClick={() => updateReviewStatus(review.id, REVIEW_STATUS.REJEITADA)}
                      >
                        Rejeitar
                      </button>
                    </>
                  ) : null}
                  {review.status === REVIEW_STATUS.APROVADA ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                      disabled={saving}
                      onClick={() => updateReviewStatus(review.id, REVIEW_STATUS.REJEITADA)}
                    >
                      Ocultar
                    </button>
                  ) : null}
                  {review.status === REVIEW_STATUS.REJEITADA ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                      disabled={saving}
                      onClick={() => updateReviewStatus(review.id, REVIEW_STATUS.APROVADA)}
                    >
                      Publicar
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="admin-reviews-empty-state">
            <p>Nenhuma avaliação encontrada com os filtros selecionados.</p>
          </div>
        )}
      </div>

      <div className="admin-reviews-pagination">
        <button
          type="button"
          className="admin-btn admin-btn-ghost admin-btn-sm"
          disabled={pagination.page <= 0}
          onClick={() => setPage((current) => Math.max(0, current - 1))}
        >
          Anterior
        </button>
        <span className="admin-reviews-pagination-label">
          Página {pagination.page + 1} de {pagination.totalPages}
          {pagination.total ? ` · ${pagination.total} avaliações` : ''}
        </span>
        <button
          type="button"
          className="admin-btn admin-btn-ghost admin-btn-sm"
          disabled={pagination.page >= pagination.totalPages - 1}
          onClick={() => setPage((current) => Math.min(pagination.totalPages - 1, current + 1))}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
