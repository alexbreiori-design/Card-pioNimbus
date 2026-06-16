import { normalizeSlug } from '@/lib/normalize';

export async function findOwnerUserId(supabase, slug) {
  const safeSlug = normalizeSlug(slug);
  const { data: empresa, error } = await supabase
    .from('empresas')
    .select('id')
    .eq('slug', safeSlug)
    .maybeSingle();
  if (error) throw error;
  if (!empresa?.id) {
    throw Object.assign(new Error('Loja não encontrada.'), { status: 404 });
  }

  const { data: membros, error: membrosError } = await supabase
    .from('empresa_membros')
    .select('usuario_id, papel, ativo')
    .eq('empresa_id', empresa.id)
    .eq('ativo', true)
    .order('created_at', { ascending: true });
  if (membrosError) throw membrosError;

  const proprietario =
    (membros || []).find((row) => row.papel === 'proprietario') || (membros || [])[0];
  if (!proprietario?.usuario_id) {
    throw Object.assign(new Error('Proprietário não encontrado nesta loja.'), { status: 404 });
  }
  return { empresaId: empresa.id, userId: proprietario.usuario_id };
}
