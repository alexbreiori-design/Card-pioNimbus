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

export function getCupomTipo(cupom) {
  return cupom?.tipoDesconto === 'percentual' ? 'percentual' : 'valor';
}

export function calculateCupomDiscount(cupom, subtotal) {
  if (!cupom) return 0;
  const base = Math.max(0, Number(subtotal) || 0);
  if (getCupomTipo(cupom) === 'percentual') {
    const pct = Number(cupom.percentualDesconto ?? cupom.valorDesconto ?? 0);
    if (!Number.isFinite(pct) || pct <= 0) return 0;
    return Math.min(base, (base * pct) / 100);
  }
  return Math.min(base, Number(cupom.valorDesconto) || 0);
}

export function formatCupomLabel(cupom) {
  if (!cupom) return '';
  if (getCupomTipo(cupom) === 'percentual') {
    return `${Number(cupom.percentualDesconto ?? cupom.valorDesconto ?? 0)}%`;
  }
  return `R$ ${Number(cupom.valorDesconto || 0).toFixed(2).replace('.', ',')}`;
}
