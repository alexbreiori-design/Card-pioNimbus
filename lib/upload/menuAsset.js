/** Envia data URL para Storage quando necessário; mantém URLs http(s) intactas. */
export async function uploadMenuAssetIfNeeded(slug, source, { folder = 'misc' } = {}) {
  const value = String(source || '').trim();
  if (!value) return '';
  if (!value.startsWith('data:image/')) return value;

  const res = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, dataUrl: value, folder }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok || !json.url) {
    throw new Error(json.error || 'Falha ao enviar imagem.');
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
