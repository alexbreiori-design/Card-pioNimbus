export function getActiveCupons(cupons = []) {
  return (cupons || [])
    .filter((c) => c.ativo !== false)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}

export function findCupomByCode(cupons, code) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return null;
  return (
    getActiveCupons(cupons).find(
      (c) => String(c.codigo || '').trim().toUpperCase() === normalized
    ) || null
  );
}

export function filterCuponsByQuery(cupons, query) {
  const q = String(query || '').trim().toUpperCase();
  const active = getActiveCupons(cupons);
  if (!q) return active;
  return active.filter((c) => String(c.codigo || '').toUpperCase().includes(q));
}
