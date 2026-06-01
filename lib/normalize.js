export function normalizeSlug(slug) {
  return String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

export { normalizePhone } from '@/lib/supabase/customers';
