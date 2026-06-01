import { normalizeSlug } from '@/lib/normalize';

export async function getEmpresaBySlug(supabase, slug) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) return null;
  const { data, error } = await supabase
    .from('empresas')
    .select(
      'id, slug, nome, latitude, longitude, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep'
    )
    .eq('slug', safeSlug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateEmpresaCoordinates(supabase, slug, { latitude, longitude }) {
  const safeSlug = normalizeSlug(slug);
  const { error } = await supabase
    .from('empresas')
    .update({
      latitude,
      longitude,
      updated_at: new Date().toISOString(),
    })
    .eq('slug', safeSlug);
  if (error) throw error;
}

export async function listZonasByEmpresaId(supabase, empresaId) {
  const { data, error } = await supabase
    .from('zonas_entrega')
    .select('id, nome, raio_km, taxa_entrega, ordem, ativo')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .order('raio_km', { ascending: true });
  if (error) throw error;
  return data || [];
}
