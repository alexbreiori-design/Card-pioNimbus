import { ADMIN_STORAGE_KEY, DEFAULT_ADMIN_DATA, withDerivedData } from '@/lib/adminData';
import { createClient } from '@/lib/supabase/client';

export function normalizeStoreSlug(slug) {
  return String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

export function getConfiguredDefaultSlug() {
  const fromEnv = normalizeStoreSlug(process.env.NEXT_PUBLIC_DEFAULT_STORE_SLUG || '');
  if (fromEnv) return fromEnv;
  return normalizeStoreSlug(DEFAULT_ADMIN_DATA.loja.slug);
}

export function readLegacyLocalStorageState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return withDerivedData(parsed);
  } catch {
    return null;
  }
}

export async function fetchFirstEmpresaSlug() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('empresas')
      .select('slug')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.slug ? normalizeStoreSlug(data.slug) : '';
  } catch {
    return '';
  }
}

export async function fetchFirstStoreStateSlug() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('menu_store_state')
      .select('slug, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.slug ? normalizeStoreSlug(data.slug) : '';
  } catch {
    return '';
  }
}

/**
 * Ordem: slug salvo no navegador (legado) → env → primeira empresa no Supabase
 * → último menu_store_state → fallback do código.
 */
export async function resolveBootSlug() {
  const legacy = readLegacyLocalStorageState();
  if (legacy?.loja?.slug) {
    return normalizeStoreSlug(legacy.loja.slug);
  }

  const configured = getConfiguredDefaultSlug();
  if (process.env.NEXT_PUBLIC_DEFAULT_STORE_SLUG) {
    return configured;
  }

  const empresaSlug = await fetchFirstEmpresaSlug();
  if (empresaSlug) return empresaSlug;

  const storeSlug = await fetchFirstStoreStateSlug();
  if (storeSlug) return storeSlug;

  return configured;
}

export function createEmptyStoreSeed(slug) {
  const safeSlug = normalizeStoreSlug(slug) || getConfiguredDefaultSlug();
  return withDerivedData({
    loja: {
      ...DEFAULT_ADMIN_DATA.loja,
      slug: safeSlug,
    },
    categorias: [],
    produtos: [],
    adicionaisCategorias: [],
    adicionaisItens: [],
    promocoes: [],
    cupons: [],
    clientes: [],
    pedidos: [],
  });
}
