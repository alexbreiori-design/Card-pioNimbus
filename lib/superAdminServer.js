import { getAuthenticatedUser } from '@/lib/supabase/membership';
import { isSuperAdminEmail } from '@/lib/superAdmin';

/** Exige sessão de super-admin; lança erro com status HTTP. */
export async function requireSuperAdmin() {
  const user = await getAuthenticatedUser();
  if (!user) {
    const err = new Error('Autenticação necessária.');
    err.status = 401;
    throw err;
  }
  if (!isSuperAdminEmail(user.email)) {
    const err = new Error('Acesso restrito ao sistema Nimbus.');
    err.status = 403;
    throw err;
  }
  return user;
}
