import { createClient } from '@supabase/supabase-js';
import { normalizeSlug } from '@/lib/normalize';
import { getServiceClient } from '@/lib/supabase/serviceRole';

const TABLE = 'menu_store_state';
function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
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

/** Catálogo público: service role ou RPC (funciona só com anon key). */
export async function fetchPublicStoreCatalogRow(slug) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) return null;

  const serviceRow = await fetchStoreStateBySlugServer(safeSlug);
  if (serviceRow) return serviceRow;

  const anon = getAnonClient();
  if (!anon) return null;

  const { data, error } = await anon.rpc('get_public_store_catalog', {
    store_slug: safeSlug,
  });
  if (error) {
    if (error.code === 'PGRST202' || error.message?.includes('get_public_store_catalog')) {
      return null;
    }
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.slug) return null;
  return {
    slug: row.slug,
    data: row.data,
    updated_at: row.updated_at,
  };
}

/** Só timestamp — para polling leve do cardápio público. */
export async function fetchPublicStoreCatalogMeta(slug) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) return null;

  const service = getServiceClient();
  if (service) {
    const { data, error } = await service
      .from(TABLE)
      .select('slug,updated_at')
      .eq('slug', safeSlug)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  const anon = getAnonClient();
  if (!anon) return null;

  const { data, error } = await anon.rpc('get_public_store_catalog_meta', {
    store_slug: safeSlug,
  });
  if (error) {
    if (error.code === 'PGRST202' || error.message?.includes('get_public_store_catalog_meta')) {
      return null;
    }
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.slug) return null;
  return { slug: row.slug, updated_at: row.updated_at };
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
