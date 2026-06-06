const DEFAULT_SUPER_ADMIN_EMAIL = 'alexbreiori@gmail.com';

/** E-mails com acesso a /admin/sistema (separados por vírgula no env). */
export function getSuperAdminEmails() {
  const raw = process.env.NIMBUS_SUPER_ADMIN_EMAILS || DEFAULT_SUPER_ADMIN_EMAIL;
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  return getSuperAdminEmails().includes(normalized);
}

export function isValidStoreSlug(slug) {
  const safe = String(slug || '').trim().toLowerCase();
  if (safe.length < 2 || safe.length > 48) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(safe);
}

export function generateTempPassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i += 1) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}
