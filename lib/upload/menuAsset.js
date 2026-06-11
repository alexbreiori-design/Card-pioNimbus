import { isDataImageUrl } from '@/lib/storage/parseDataUrl';

/** Envia data URL para Storage; nunca persiste base64 no JSON. */
export async function uploadMenuAssetIfNeeded(slug, source, { folder = 'misc' } = {}) {
  const value = String(source || '').trim();
  if (!value) return '';
  if (!isDataImageUrl(value)) return value;

  const safeSlug = String(slug || '').trim().toLowerCase();
  if (!safeSlug) {
    throw new Error('Configure o slug da loja antes de enviar imagens.');
  }

  const res = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: safeSlug, dataUrl: value, folder }),
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
