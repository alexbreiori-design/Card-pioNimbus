import { getServiceClient } from '@/lib/supabase/serviceRole';

export const WHATS_NEW_BUCKET = 'whats-new';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);

export function mediaTypeFromMime(mime) {
  const value = String(mime || '').trim().toLowerCase();
  if (IMAGE_TYPES.has(value)) return 'image';
  if (VIDEO_TYPES.has(value)) return 'video';
  return null;
}

export function isAllowedWhatsNewMime(mime) {
  return Boolean(mediaTypeFromMime(mime));
}

export function extensionForWhatsNewMime(mime) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  };
  return map[String(mime || '').trim().toLowerCase()] || 'bin';
}

export function publicWhatsNewUrl(mediaPath) {
  const path = String(mediaPath || '').trim();
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const supabase = getServiceClient();
  if (!supabase) return null;
  const {
    data: { publicUrl },
  } = supabase.storage.from(WHATS_NEW_BUCKET).getPublicUrl(path);
  return publicUrl || null;
}

export const WHATS_NEW_MAX_IMAGES = 12;

export function clampDurationSeconds(value, fallback = 8) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(120, Math.max(3, Math.round(n)));
}

/** Lista limpa de paths (máx. 12). Aceita array ou path único legado. */
export function coerceMediaPaths(paths, fallbackPath = null) {
  const list = [];
  const push = (value) => {
    const path = String(value || '').trim();
    if (!path || list.includes(path)) return;
    if (list.length >= WHATS_NEW_MAX_IMAGES) return;
    list.push(path);
  };

  if (Array.isArray(paths)) {
    for (const item of paths) push(item);
  } else if (typeof paths === 'string' && paths.trim()) {
    push(paths);
  }

  if (!list.length) push(fallbackPath);
  return list;
}

export function mediaPayloadFromBody(body = {}) {
  const mediaTypeRaw = String(body.mediaType ?? body.media_type ?? '').trim();
  const mediaType = mediaTypeRaw === 'image' || mediaTypeRaw === 'video' ? mediaTypeRaw : null;
  const mediaPaths = coerceMediaPaths(
    body.mediaPaths ?? body.media_paths,
    body.mediaPath ?? body.media_path
  );

  // Vídeo: só um arquivo. Imagens: galeria.
  const normalizedPaths =
    mediaType === 'video' ? mediaPaths.slice(0, 1) : mediaType === 'image' ? mediaPaths : [];

  return {
    media_path: normalizedPaths[0] || null,
    media_paths: normalizedPaths,
    media_type: normalizedPaths.length ? mediaType : null,
  };
}

export function collectEntryMediaPaths(row) {
  return coerceMediaPaths(row?.media_paths, row?.media_path);
}

export function mapWhatsNewEntry(row, extras = {}) {
  if (!row) return null;
  const mediaPaths = collectEntryMediaPaths(row);
  const mediaUrls = mediaPaths.map((path) => publicWhatsNewUrl(path)).filter(Boolean);
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    mediaPath: mediaPaths[0] || null,
    mediaPaths,
    mediaType: row.media_type || null,
    mediaUrl: mediaUrls[0] || null,
    mediaUrls,
    ctaLabel: row.cta_label || null,
    ctaHref: row.cta_href || null,
    durationSeconds: clampDurationSeconds(row.duration_seconds, 8),
    status: row.status || 'draft',
    publishedAt: row.published_at || null,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    createdBy: row.created_by || null,
    ...extras,
  };
}

export async function countActiveStores(supabase) {
  const { count, error } = await supabase
    .from('empresas')
    .select('id', { count: 'exact', head: true })
    .not('suspensa', 'is', true);
  if (error) {
    // fallback se a coluna não existir em algum ambiente legado
    const fallback = await supabase.from('empresas').select('id', { count: 'exact', head: true });
    if (fallback.error) throw error;
    return Number(fallback.count || 0);
  }
  return Number(count || 0);
}

export async function resolveEmpresaIdBySlug(supabase, slug) {
  const { data, error } = await supabase
    .from('empresas')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}
