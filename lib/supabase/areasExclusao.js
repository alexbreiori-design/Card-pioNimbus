import { createClient } from './client';

const SELECT_COLS =
  'id, empresa_id, nome, sul, oeste, norte, leste, ordem, ativo, created_at';

export async function listAreasExclusaoByEmpresaId(empresaId) {
  if (!empresaId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('areas_exclusao_entrega')
    .select(SELECT_COLS)
    .eq('empresa_id', empresaId)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createAreaExclusao(empresaId, payload) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('areas_exclusao_entrega')
    .insert({
      empresa_id: empresaId,
      nome: payload.nome || 'Exclusão',
      sul: payload.sul,
      oeste: payload.oeste,
      norte: payload.norte,
      leste: payload.leste,
      ordem: payload.ordem ?? 0,
      ativo: payload.ativo !== false,
    })
    .select(SELECT_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateAreaExclusao(id, payload) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('areas_exclusao_entrega')
    .update({
      nome: payload.nome,
      sul: payload.sul,
      oeste: payload.oeste,
      norte: payload.norte,
      leste: payload.leste,
      ordem: payload.ordem,
      ativo: payload.ativo,
    })
    .eq('id', id)
    .select(SELECT_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAreaExclusao(id) {
  const supabase = createClient();
  const { error } = await supabase.from('areas_exclusao_entrega').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Sincroniza o conjunto de exclusões da empresa com o estado do editor.
 * `items` = lista atual no modal; `previousIds` = ids que existiam ao abrir.
 */
export async function syncAreasExclusao(empresaId, items, previousIds = []) {
  if (!empresaId) return [];
  const prev = new Set((previousIds || []).filter(Boolean));
  const nextIds = new Set(items.filter((item) => item.id && !String(item.id).startsWith('tmp-')).map((item) => item.id));

  for (const id of prev) {
    if (!nextIds.has(id)) {
      await deleteAreaExclusao(id);
    }
  }

  const saved = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const payload = {
      nome: String(item.nome || `Exclusão ${index + 1}`).trim() || `Exclusão ${index + 1}`,
      sul: Number(item.sul),
      oeste: Number(item.oeste),
      norte: Number(item.norte),
      leste: Number(item.leste),
      ordem: index,
      ativo: item.ativo !== false,
    };
    const isPersisted = item.id && !String(item.id).startsWith('tmp-');
    if (isPersisted) {
      saved.push(await updateAreaExclusao(item.id, payload));
    } else {
      saved.push(await createAreaExclusao(empresaId, payload));
    }
  }
  return saved;
}
