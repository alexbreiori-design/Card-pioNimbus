import { generateTempPassword } from '@/lib/superAdmin';
import { findOwnerUserId } from '@/lib/superAdmin/ownerLookup';

export async function resetStoreOwnerPassword(supabase, slug) {
  const { userId } = await findOwnerUserId(supabase, slug);
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
