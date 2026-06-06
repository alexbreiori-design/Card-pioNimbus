/** Busca usuário no Supabase Auth por e-mail (paginação admin). */
export async function findAuthUserByEmail(supabase, email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;

  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (match) return match;
    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}
