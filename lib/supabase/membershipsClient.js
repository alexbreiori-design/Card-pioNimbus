import { createClient } from '@/lib/supabase/client';
import { normalizeStoreSlug, pickActiveStoreSlug, readActiveStoreSlug } from '@/lib/adminStoreSession';

function mapMembershipRow(row) {
  const empresa = row?.empresas;
  if (!empresa?.slug) return null;
  return {
    empresaId: empresa.id,
    slug: normalizeStoreSlug(empresa.slug),
    nome: empresa.nome || empresa.slug,
    papel: row.papel || 'atendente',
  };
}

/** Lista lojas às quais o usuário autenticado pertence (client). */
export async function fetchUserMembershipsClient() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return [];

  const { data, error } = await supabase
    .from('empresa_membros')
    .select('papel, ativo, empresas ( id, slug, nome )')
    .eq('ativo', true)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || [])
    .map(mapMembershipRow)
    .filter(Boolean)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function resolveAdminBootSlugClient() {
  const memberships = await fetchUserMembershipsClient();
  const slug = pickActiveStoreSlug(memberships, readActiveStoreSlug());
  return { slug, memberships };
}
