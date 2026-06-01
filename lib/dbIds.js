const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** IDs do JSON do cardápio (ex.: prod-2) não são UUID — gravar null no Supabase. */
export function toDbUuidOrNull(value) {
  const id = String(value || '').trim();
  return UUID_RE.test(id) ? id : null;
}
