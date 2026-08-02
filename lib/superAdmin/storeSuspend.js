import { normalizeSlug } from '@/lib/normalize';

export async function setStoreSuspended(supabase, slug, suspensa, { motivo, autorUserId, autorEmail } = {}) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    throw Object.assign(new Error('Slug inválido.'), { status: 400 });
  }

  const nextSuspended = Boolean(suspensa);
  const safeMotivo = String(motivo || '').trim() || null;
  const updates = {
    suspensa: nextSuspended,
    suspensa_em: nextSuspended ? new Date().toISOString() : null,
    suspensa_motivo: nextSuspended ? safeMotivo : null,
    updated_at: new Date().toISOString(),
  };

  let result = await supabase
    .from('empresas')
    .update(updates)
    .eq('slug', safeSlug)
    .select('id, slug, nome, suspensa, suspensa_em, suspensa_motivo')
    .maybeSingle();

  if (result.error?.message?.includes('suspensa_motivo')) {
    const { suspensa_motivo: _suspensaMotivo, ...withoutMotivo } = updates;
    result = await supabase
      .from('empresas')
      .update(withoutMotivo)
      .eq('slug', safeSlug)
      .select('id, slug, nome, suspensa, suspensa_em')
      .maybeSingle();
    if (result.data) result.data.suspensa_motivo = null;
  }

  if (result.error?.message?.includes('suspensa')) {
    throw Object.assign(new Error('Rode a migration 012 para suspender lojas.'), { status: 400 });
  }
  if (result.error) throw result.error;
  if (!result.data) {
    throw Object.assign(new Error('Loja não encontrada.'), { status: 404 });
  }

  try {
    await supabase.from('empresa_suspensao_eventos').insert({
      empresa_id: result.data.id,
      acao: nextSuspended ? 'suspender' : 'reativar',
      motivo: safeMotivo,
      autor_user_id: autorUserId || null,
      autor_email: autorEmail || null,
    });
  } catch (error) {
    console.warn('[storeSuspend] empresa_suspensao_eventos indisponível:', error?.message || error);
  }

  return result.data;
}
