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

export function clampDurationSeconds(value, fallback = 8) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(120, Math.max(3, Math.round(n)));
}

export function mapWhatsNewEntry(row, extras = {}) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    mediaPath: row.media_path || null,
    mediaType: row.media_type || null,
    mediaUrl: publicWhatsNewUrl(row.media_path),
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
