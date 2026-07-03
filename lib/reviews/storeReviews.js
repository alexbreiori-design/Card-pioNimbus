import { STORE_REVIEWS_UI_ENABLED } from '@/lib/features';

const STAR_LEVELS = [5, 4, 3, 2, 1];

export const REVIEW_STATUS = {
  PENDENTE: 'pendente',
  APROVADA: 'aprovada',
  REJEITADA: 'rejeitada',
};

function clampRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function parseReviewDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (status === REVIEW_STATUS.PENDENTE) return REVIEW_STATUS.PENDENTE;
  if (status === REVIEW_STATUS.REJEITADA) return REVIEW_STATUS.REJEITADA;
  if (status === REVIEW_STATUS.APROVADA) return REVIEW_STATUS.APROVADA;
  return REVIEW_STATUS.APROVADA;
}

export function normalizeStoreReview(item, index = 0) {
  if (!item || typeof item !== 'object') return null;

  const nota = clampRating(item?.nota ?? item?.rating ?? item?.stars);
  const comentario = String(item?.comentario ?? item?.texto ?? item?.comment ?? '').trim();
  const nome = String(item?.nome ?? item?.author ?? item?.cliente ?? 'Cliente').trim() || 'Cliente';
  const criadoEm = parseReviewDate(item?.criadoEm ?? item?.data ?? item?.createdAt);
  const avatarUrl = String(item?.avatarUrl ?? item?.foto ?? '').trim();
  const status = normalizeStatus(item?.status);

  if (!nota && !comentario) return null;

  return {
    id: String(item?.id ?? `review-${index}`),
    nome,
    nota: nota || 5,
    comentario,
    criadoEm,
    avatarUrl,
    status,
  };
}

export function normalizeStoreReviews(raw = []) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => normalizeStoreReview(item, index))
    .filter(Boolean)
    .sort((a, b) => {
      const ta = a.criadoEm?.getTime() ?? 0;
      const tb = b.criadoEm?.getTime() ?? 0;
      return tb - ta;
    });
}

export function getApprovedReviews(raw = []) {
  return normalizeStoreReviews(raw).filter((review) => review.status === REVIEW_STATUS.APROVADA);
}

export function getPendingReviews(raw = []) {
  return normalizeStoreReviews(raw).filter((review) => review.status === REVIEW_STATUS.PENDENTE);
}

export function buildReviewStats(reviews = []) {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let total = 0;

  reviews.forEach((review) => {
    const star = clampRating(review.nota);
    if (!star) return;
    counts[star] += 1;
    total += star;
  });

  const count = reviews.length;
  const average = count ? total / count : 0;

  return {
    count,
    average,
    averageLabel: count ? average.toFixed(1).replace('.', ',') : '0,0',
    distribution: STAR_LEVELS.map((star) => ({
      star,
      count: counts[star],
      percent: count ? Math.round((counts[star] / count) * 100) : 0,
    })),
  };
}

export function formatReviewDate(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function truncateReviewLine(text, max = 88) {
  const value = String(text || '').trim().replace(/\s+/g, ' ');
  if (!value) return '';
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

export function validateReviewSubmission({ nome, nota, comentario }) {
  const safeName = String(nome || '').trim();
  const safeComment = String(comentario || '').trim();
  const rating = clampRating(nota);

  if (safeName.length < 2) {
    return { ok: false, error: 'Informe seu nome com pelo menos 2 caracteres.' };
  }
  if (safeName.length > 80) {
    return { ok: false, error: 'Nome muito longo.' };
  }
  if (!rating) {
    return { ok: false, error: 'Selecione uma nota de 1 a 5 estrelas.' };
  }
  if (safeComment.length < 4) {
    return { ok: false, error: 'Descreva sua experiência com pelo menos 4 caracteres.' };
  }
  if (safeComment.length > 500) {
    return { ok: false, error: 'Comentário muito longo (máx. 500 caracteres).' };
  }

  return {
    ok: true,
    value: {
      nome: safeName,
      nota: rating,
      comentario: safeComment,
    },
  };
}

export function createPendingReview({ nome, nota, comentario }) {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    nome,
    nota,
    comentario,
    status: REVIEW_STATUS.PENDENTE,
    criadoEm: new Date().toISOString(),
  };
}

export function isReviewsEnabledOnCardapio(loja = {}) {
  if (!STORE_REVIEWS_UI_ENABLED) return false;
  return loja?.exibirAvaliacoesCardapio !== false;
}

export function filterAdminReviews(reviews = [], { status = 'all', stars = 'all' } = {}) {
  return normalizeStoreReviews(reviews).filter((review) => {
    if (status !== 'all' && review.status !== status) return false;
    if (stars !== 'all' && Number(stars) !== review.nota) return false;
    return true;
  });
}

export function paginateItems(items = [], page = 0, pageSize = 5) {
  const safePageSize = Math.max(1, Number(pageSize) || 5);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(0, Number(page) || 0), totalPages - 1);
  const start = safePage * safePageSize;

  return {
    items: items.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages,
  };
}

export function setReviewStatus(reviews = [], reviewId, status) {
  const nextStatus = normalizeStatus(status);
  return normalizeStoreReviews(reviews).map((review) => {
    const serialized = {
      id: review.id,
      nome: review.nome,
      nota: review.nota,
      comentario: review.comentario,
      status: review.id === reviewId ? nextStatus : review.status,
      criadoEm:
        review.criadoEm instanceof Date
          ? review.criadoEm.toISOString()
          : review.criadoEm || new Date().toISOString(),
      ...(review.avatarUrl ? { avatarUrl: review.avatarUrl } : {}),
    };
    return serialized;
  });
}
