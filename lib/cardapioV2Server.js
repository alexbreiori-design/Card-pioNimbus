import { redirect } from 'next/navigation';
import { buildCardapioV2Path } from '@/lib/cardapioV2';
import { getAuthenticatedUser } from '@/lib/supabase/membership';
import { isSuperAdminEmail } from '@/lib/superAdmin';
import { getStorePublicUrl } from '@/lib/siteUrl';

/**
 * Preview v2: mesma regra da landing /home — só super-admin.
 * Demais usuários voltam ao cardápio v1 (URL pública da loja).
 */
export async function requireCardapioV2PreviewAccess(slug) {
  const user = await getAuthenticatedUser();

  if (!user) {
    const returnPath = buildCardapioV2Path(slug);
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  }

  if (!isSuperAdminEmail(user.email)) {
    redirect(getStorePublicUrl(slug));
  }
}
