import { createClient } from '@/lib/supabase/client';

const TABLE = 'menu_store_state';

function normalizeSlug(slug) {
  return String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

export async function fetchStoreStateBySlug(slug) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('slug,data,updated_at')
    .eq('slug', safeSlug)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function upsertStoreState(slug, state) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) throw new Error('Slug invalido para salvar cardapio.');
  const supabase = createClient();
  const payload = {
    slug: safeSlug,
    data: state,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'slug' });
  if (error) throw error;
  return payload;
}

