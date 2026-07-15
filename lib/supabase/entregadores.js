import { createClient } from './client';

export async function listEntregadoresByEmpresaId(empresaId, { onlyActive = false } = {}) {
  if (!empresaId) return [];
  const supabase = createClient();
  let query = supabase
    .from('entregadores')
    .select('id, empresa_id, nome, telefone, ativo, created_at, updated_at')
    .eq('empresa_id', empresaId)
    .order('nome', { ascending: true });
  if (onlyActive) query = query.eq('ativo', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createEntregador(empresaId, payload) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('entregadores')
    .insert({
      empresa_id: empresaId,
      nome: String(payload.nome || '').trim(),
      telefone: String(payload.telefone || '').trim() || null,
      ativo: payload.ativo !== false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEntregador(id, payload) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('entregadores')
    .update({
      nome: String(payload.nome || '').trim(),
      telefone: String(payload.telefone || '').trim() || null,
      ativo: payload.ativo !== false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEntregador(id) {
  const supabase = createClient();
  const { error } = await supabase.from('entregadores').delete().eq('id', id);
  if (error) throw error;
}
