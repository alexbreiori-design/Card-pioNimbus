import { createClient } from '@/lib/supabase/server';
import { normalizeSlug } from '@/lib/normalize';

/** Retorna usuário autenticado ou null. */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/** Verifica se o usuário tem ao menos uma loja vinculada. */
export async function userHasAnyMembership(userId) {
  if (!userId) return false;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('empresa_membros')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', userId)
    .eq('ativo', true);
  if (error) return false;
  return (count ?? 0) > 0;
}

export async function listUserMemberships(userId) {
  if (!userId) return [];
  const supabase = await createClient();
  let { data, error } = await supabase
    .from('empresa_membros')
    .select('papel, ativo, empresas ( id, slug, nome, suspensa )')
    .eq('usuario_id', userId)
    .eq('ativo', true)
    .order('created_at', { ascending: true });

  if (error?.message?.includes('suspensa')) {
    ({ data, error } = await supabase
      .from('empresa_membros')
      .select('papel, ativo, empresas ( id, slug, nome )')
      .eq('usuario_id', userId)
      .eq('ativo', true)
      .order('created_at', { ascending: true }));
  }

  if (error) return [];
  return (data || [])
    .filter((row) => row?.empresas?.slug && row.empresas.suspensa !== true)
    .map((row) => ({
      empresaId: row.empresas.id,
      slug: normalizeSlug(row.empresas.slug),
      nome: row.empresas.nome || row.empresas.slug,
      papel: row.papel || 'atendente',
    }));
}

/** Verifica se o usuário autenticado é membro ativo da loja (slug). */
export async function userHasStoreMembership(userId, slug) {
  const safeSlug = normalizeSlug(slug);
  if (!userId || !safeSlug) return false;

  const supabase = await createClient();
  const { data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .select('id')
    .eq('slug', safeSlug)
    .maybeSingle();
  if (empresaError || !empresa?.id) return false;

  const { data: membro, error: membroError } = await supabase
    .from('empresa_membros')
    .select('id')
    .eq('empresa_id', empresa.id)
    .eq('usuario_id', userId)
    .eq('ativo', true)
    .maybeSingle();
  if (membroError) return false;
  return Boolean(membro?.id);
}

/** Exige sessão admin com vínculo à loja; lança erro com status HTTP. */
export async function requireStoreAdmin(slug) {
  const user = await getAuthenticatedUser();
  if (!user) {
    const err = new Error('Autenticação necessária.');
    err.status = 401;
    throw err;
  }
  const allowed = await userHasStoreMembership(user.id, slug);
  if (!allowed) {
    const err = new Error('Sem permissão para esta loja.');
    err.status = 403;
    throw err;
  }
  return user;
}
