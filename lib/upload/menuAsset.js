import { compressImageDataUrl } from '@/lib/image/compressImage';
import { isDataImageUrl } from '@/lib/storage/parseDataUrl';

const COMPRESS_BY_FOLDER = {
  loja: { maxSize: 2400, quality: 0.82, maxLength: 900000 },
  produtos: { maxSize: 900, quality: 0.72, maxLength: 280000 },
  adicionais: { maxSize: 900, quality: 0.72, maxLength: 280000 },
  marmitas: { maxSize: 900, quality: 0.72, maxLength: 280000 },
  pizzas: { maxSize: 900, quality: 0.72, maxLength: 280000 },
};

/** Envia data URL para Storage; nunca persiste base64 no JSON. */
export async function uploadMenuAssetIfNeeded(slug, source, { folder = 'misc' } = {}) {
  const value = String(source || '').trim();
  if (!value) return '';
  if (!isDataImageUrl(value)) return value;

  const safeSlug = String(slug || '').trim().toLowerCase();
  if (!safeSlug) {
    throw new Error('Configure o slug da loja antes de enviar imagens.');
  }

  const compressOptions = COMPRESS_BY_FOLDER[folder] || COMPRESS_BY_FOLDER.produtos;
  const dataUrl = await compressImageDataUrl(value, compressOptions);

  const res = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: safeSlug, dataUrl, folder }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok || !json.url) {
    throw new Error(json.error || 'Falha ao enviar imagem para o Storage.');
  }
  return json.url;
}

export async function mapMenuAssets(slug, items, folder) {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      imagemUrl: await uploadMenuAssetIfNeeded(slug, item.imagemUrl, { folder }),
    }))
  );
}
