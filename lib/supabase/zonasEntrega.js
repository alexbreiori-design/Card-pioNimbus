import { createClient } from './client';

export async function listZonasByEmpresaId(empresaId) {
  if (!empresaId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('zonas_entrega')
    .select('id, empresa_id, nome, raio_km, taxa_entrega, ordem, ativo')
    .eq('empresa_id', empresaId)
    .order('ordem', { ascending: true })
    .order('raio_km', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createZona(empresaId, payload) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('zonas_entrega')
    .insert({
      empresa_id: empresaId,
      nome: payload.nome,
      raio_km: payload.raio_km,
      taxa_entrega: payload.taxa_entrega,
      ordem: payload.ordem ?? 0,
      ativo: payload.ativo !== false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateZona(id, payload) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('zonas_entrega')
    .update({
      nome: payload.nome,
      raio_km: payload.raio_km,
      taxa_entrega: payload.taxa_entrega,
      ordem: payload.ordem,
      ativo: payload.ativo,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteZona(id) {
  const supabase = createClient();
  const { error } = await supabase.from('zonas_entrega').delete().eq('id', id);
  if (error) throw error;
}
