import { normalizeSlug } from '@/lib/normalize';

export async function setStoreSuspended(supabase, slug, suspensa) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    throw Object.assign(new Error('Slug inválido.'), { status: 400 });
  }

  const nextSuspended = Boolean(suspensa);
  const updates = {
    suspensa: nextSuspended,
    suspensa_em: nextSuspended ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  let result = await supabase
    .from('empresas')
    .update(updates)
    .eq('slug', safeSlug)
    .select('slug, nome, suspensa, suspensa_em')
    .maybeSingle();

  if (result.error?.message?.includes('suspensa')) {
    throw Object.assign(new Error('Rode a migration 012 para suspender lojas.'), { status: 400 });
  }
  if (result.error) throw result.error;
  if (!result.data) {
    throw Object.assign(new Error('Loja não encontrada.'), { status: 404 });
  }

  return result.data;
}
