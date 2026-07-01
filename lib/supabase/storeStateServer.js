import { createClient } from '@supabase/supabase-js';
import { buildCatalogPublic } from '@/lib/catalogPublic';
import {
  loadAssembledStoreState,
  persistModularStoreState,
  rebuildCatalogPublicForSlug,
} from '@/lib/catalog/storeCatalogRepository';
import { normalizeSlug } from '@/lib/normalize';
import { assessStoreStateSize, STORE_STATE_MAX_BYTES } from '@/lib/storeStateSize';
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

  const loaded = await loadAssembledStoreState(supabase, safeSlug);
  if (!loaded) return null;

  return {
    slug: loaded.slug,
    data: loaded.data,
    catalog_public: loaded.catalog_public,
    updated_at: loaded.updated_at,
  };
}

async function resolvePublicCatalogData(supabase, safeSlug, loaded) {
  if (!loaded.data) return loaded.catalog_public || null;

  const freshCatalog = buildCatalogPublic(loaded.data);
  if (!freshCatalog) return null;

  const cachedProducts = loaded.catalog_public?.catalog?.products?.length ?? -1;
  const freshProducts = freshCatalog.catalog?.products?.length ?? 0;
  const cachedRevision = loaded.catalog_public?._meta?.revision ?? -1;
  const freshRevision = freshCatalog._meta?.revision ?? 0;
  const cachedLayouts = JSON.stringify(loaded.catalog_public?.catalog?.categoryLayoutsByName || {});
  const freshLayouts = JSON.stringify(freshCatalog.catalog?.categoryLayoutsByName || {});
  const cacheStale =
    !loaded.catalog_public ||
    cachedProducts !== freshProducts ||
    cachedRevision !== freshRevision ||
    cachedLayouts !== freshLayouts;

  if (cacheStale) {
    const { error } = await supabase
      .from(TABLE)
      .update({ catalog_public: freshCatalog })
      .eq('slug', safeSlug);
    if (error) throw error;
  }

  return freshCatalog;
}

function toPublicCatalogRow(row, publicData) {
  return {
    slug: row.slug,
    data: publicData,
    updated_at: row.updated_at,
  };
}

/** Catálogo público: service role ou RPC (funciona só com anon key). */
export async function fetchPublicStoreCatalogRow(slug) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) return null;

  const supabase = getServiceClient();
  if (supabase) {
    const loaded = await loadAssembledStoreState(supabase, safeSlug);
    if (loaded) {
      const publicData = await resolvePublicCatalogData(supabase, safeSlug, loaded);
      if (publicData) {
        return toPublicCatalogRow(
          { slug: loaded.slug, updated_at: loaded.updated_at },
          publicData
        );
      }
    }
  }

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

  const sizeReport = assessStoreStateSize(state);
  if (sizeReport.blocked) {
    throw Object.assign(
      new Error(
        `Estado da loja muito grande (${sizeReport.kb} KB). Limite: ${Math.round(STORE_STATE_MAX_BYTES / 1024)} KB.`
      ),
      { status: 413, sizeReport }
    );
  }

  const saved = await persistModularStoreState(supabase, safeSlug, state);
  return { ...saved, sizeReport };
}

export async function deleteStoreStateServer(slug) {
  const supabase = getServiceClient();
  if (!supabase) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) throw new Error('Slug invalido.');
  const { error } = await supabase.from(TABLE).delete().eq('slug', safeSlug);
  if (error) throw error;
}

export async function rebuildAllCatalogPublicServer() {
  const supabase = getServiceClient();
  if (!supabase) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');

  const { data: rows, error } = await supabase.from(TABLE).select('slug');
  if (error) throw error;

  const results = [];
  for (const row of rows || []) {
    try {
      const rebuilt = await rebuildCatalogPublicForSlug(supabase, row.slug);
      results.push({ slug: row.slug, ok: Boolean(rebuilt?.catalog_public) });
    } catch (err) {
      results.push({ slug: row.slug, ok: false, error: err?.message || 'erro' });
    }
  }
  return results;
}

export { rebuildCatalogPublicForSlug };
