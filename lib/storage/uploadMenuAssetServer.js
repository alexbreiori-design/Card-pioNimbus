import { extensionForImageMime, parseImageDataUrl } from '@/lib/storage/parseDataUrl';
import { normalizeSlug } from '@/lib/normalize';

const BUCKET = 'menu-assets';

export async function uploadMenuAssetFromDataUrl(supabase, slug, dataUrl, { folder = 'misc' } = {}) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) throw new Error('Slug inválido para upload de imagem.');
  const value = String(dataUrl || '').trim();
  if (!value) return '';
  if (!value.startsWith('data:image/')) return value;

  const parsed = parseImageDataUrl(value);
  if (!parsed?.buffer?.length) throw new Error('Imagem inválida.');

  const safeFolder = String(folder || 'misc').replace(/[^a-z0-9-_]/gi, '') || 'misc';
  const ext = extensionForImageMime(parsed.mime);
  const objectPath = `${safeSlug}/${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, parsed.buffer, {
    contentType: parsed.mime,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

  return publicUrl;
}
