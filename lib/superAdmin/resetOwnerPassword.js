import { generateTempPassword } from '@/lib/superAdmin';
import { normalizeSlug } from '@/lib/normalize';

async function findOwnerUserId(supabase, slug) {
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
  return proprietario.usuario_id;
}

export async function resetStoreOwnerPassword(supabase, slug) {
  const userId = await findOwnerUserId(supabase, slug);
  const tempPassword = generateTempPassword();

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: tempPassword,
  });
  if (error) {
    throw Object.assign(new Error(error.message || 'Não foi possível resetar a senha.'), {
      status: 400,
    });
  }

  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  return {
    email: authUser?.user?.email || null,
    tempPassword,
  };
}
