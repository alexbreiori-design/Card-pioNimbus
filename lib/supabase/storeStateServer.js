import { createClient } from '@supabase/supabase-js';

const TABLE = 'menu_store_state';

function normalizeSlug(slug) {
  return String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function fetchStoreStateBySlugServer(slug) {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('slug,data,updated_at')
    .eq('slug', safeSlug)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function upsertStoreStateServer(slug, state) {
  const supabase = getServiceClient();
  if (!supabase) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) throw new Error('Slug invalido para salvar cardapio.');
  const payload = {
    slug: safeSlug,
    data: state,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'slug' })
    .select('slug,data,updated_at')
    .single();
  if (error) throw error;
  return data;
}
