import { withDerivedData } from '@/lib/adminData';

export async function fetchStoreStateMetaRemote(slug, { scope = 'public' } = {}) {
  const safeSlug = String(slug || '').trim().toLowerCase();
  if (!safeSlug) return null;

  try {
    const params = new URLSearchParams({ slug: safeSlug, scope, meta: '1' });
    const res = await fetch(`/api/store-state?${params.toString()}`, {
      cache: 'no-store',
      credentials: scope === 'admin' ? 'include' : 'same-origin',
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      return { slug: json.slug, updated_at: json.updated_at };
    }
  } catch {
    return null;
  }

  return null;
}

export async function fetchStoreStateRemote(slug, { scope = 'public' } = {}) {
  const safeSlug = String(slug || '').trim().toLowerCase();
  if (!safeSlug) return null;

  try {
    const params = new URLSearchParams({ slug: safeSlug, scope });
    const res = await fetch(`/api/store-state?${params.toString()}`, {
      cache: 'no-store',
      credentials: scope === 'admin' ? 'include' : 'same-origin',
    });
    const json = await res.json();
    if (res.ok && json.ok && json.data) {
      const payload = scope === 'admin' ? withDerivedData(json.data) : json.data;
      return {
        data: payload,
        updated_at: json.updated_at,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export async function saveStoreStateRemote(slug, data) {
  const safeSlug = String(slug || '').trim().toLowerCase();
  if (!safeSlug) throw new Error('Slug inválido.');
  const res = await fetch('/api/store-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ slug: safeSlug, data: withDerivedData(data) }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(json.error || 'Erro ao salvar cardápio.');
  }
  return json;
}
