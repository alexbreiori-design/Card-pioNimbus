import { redirect } from 'next/navigation';
import { buildCardapioV2Path } from '@/lib/cardapioV2';
import { getAuthenticatedUser } from '@/lib/supabase/membership';
import { isSuperAdminEmail } from '@/lib/superAdmin';
import { getStorePublicUrl } from '@/lib/siteUrl';

/**
 * Preview v2: só super-admin (mesma ideia do antigo gate de /home).
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
