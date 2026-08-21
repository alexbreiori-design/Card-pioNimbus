import { createClient } from './client';
import { isEntregadorWhatsAppValid } from '@/lib/delivery/routeShareMessage';

function requireWhatsApp(telefone) {
  const raw = String(telefone || '').trim();
  if (!isEntregadorWhatsAppValid(raw)) {
    throw new Error('Informe o WhatsApp com DDD e 11 dígitos (ex.: 11 9 8765-4321).');
  }
  return raw;
}

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
  const telefone = requireWhatsApp(payload.telefone);
  const { data, error } = await supabase
    .from('entregadores')
    .insert({
      empresa_id: empresaId,
      nome: String(payload.nome || '').trim(),
      telefone,
      ativo: payload.ativo !== false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEntregador(id, payload) {
  const supabase = createClient();
  const patch = {
    updated_at: new Date().toISOString(),
  };
  if (payload.nome !== undefined) {
    patch.nome = String(payload.nome || '').trim();
  }
  if (payload.telefone !== undefined) {
    patch.telefone = requireWhatsApp(payload.telefone);
  }
  if (payload.ativo !== undefined) {
    patch.ativo = payload.ativo !== false;
  }
  const { data, error } = await supabase
    .from('entregadores')
    .update(patch)
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
