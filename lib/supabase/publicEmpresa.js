import { createClient } from './client';
import { normalizeSlug } from '@/lib/normalize';

/** Campos seguros da loja para o cardápio público (sem chave Pix / CNPJ). */
export async function fetchPublicEmpresaCardapio(slug) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) return null;

  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_public_empresa_cardapio', {
    store_slug: safeSlug,
  });
  if (error) throw error;
  return data && typeof data === 'object' ? data : null;
}

export async function fetchFirstOpenEmpresaSlug() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_first_open_empresa_slug');
  if (error) throw error;
  return data ? normalizeSlug(data) : '';
}
