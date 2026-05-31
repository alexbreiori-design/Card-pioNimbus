import { withDerivedData } from '@/lib/adminData';
import { fetchStoreStateBySlug } from '@/lib/supabase/storeState';

export async function fetchStoreStateRemote(slug) {
  const safeSlug = String(slug || '').trim().toLowerCase();
  if (!safeSlug) return null;

  try {
    const res = await fetch(`/api/store-state?slug=${encodeURIComponent(safeSlug)}`, {
      cache: 'no-store',
    });
    const json = await res.json();
    if (res.ok && json.ok && json.data) {
      return {
        data: withDerivedData(json.data),
        updated_at: json.updated_at,
      };
    }
  } catch {
    /* tenta Supabase direto */
  }

  try {
    const row = await fetchStoreStateBySlug(safeSlug);
    if (!row?.data) return null;
    return {
      data: withDerivedData(row.data),
      updated_at: row.updated_at,
    };
  } catch {
    return null;
  }
}

export async function saveStoreStateRemote(slug, data) {
  const safeSlug = String(slug || '').trim().toLowerCase();
  if (!safeSlug) throw new Error('Slug inválido.');
  const res = await fetch('/api/store-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: safeSlug, data: withDerivedData(data) }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(json.error || 'Erro ao salvar cardápio.');
  }
  return json;
}
