/** Seleção de adicionais por seção: mapa { [itemId]: qty } (arrays legados = qty 1). */

export function sectionToQtyMap(selection) {
  if (!selection) return {};
  if (Array.isArray(selection)) {
    const map = {};
    selection.forEach((id) => {
      const key = String(id || '');
      if (!key) return;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }
  if (typeof selection === 'object') {
    const map = {};
    Object.entries(selection).forEach(([id, qty]) => {
      const key = String(id || '');
      if (!key) return;
      const n = Math.max(0, Math.floor(Number(qty) || 0));
      if (n > 0) map[key] = n;
    });
    return map;
  }
  return {};
}

export function sectionTotalQty(selection) {
  return Object.values(sectionToQtyMap(selection)).reduce((sum, qty) => sum + qty, 0);
}

export function sectionItemQty(selection, itemId) {
  return Number(sectionToQtyMap(selection)[String(itemId)] || 0);
}

export function sectionHasItem(selection, itemId) {
  return sectionItemQty(selection, itemId) > 0;
}

export function sectionSelectedIds(selection) {
  return Object.keys(sectionToQtyMap(selection));
}

export function formatAddonOptLabel(name, qty = 1) {
  const q = Math.max(1, Number(qty) || 1);
  const label = String(name || '').trim();
  if (!label) return '';
  return q > 1 ? `${q}x ${label}` : label;
}

export function isAddonSectionComplete(section, selection) {
  const minRequired = section?.required
    ? Math.max(1, Number(section.min || 1))
    : Number(section?.min || 0);
  return sectionTotalQty(selection) >= minRequired;
}

export function collectAddonOptLabels(product, selectedAddons) {
  const labels = [];
  (product?.addons || []).forEach((sec, si) => {
    const map = sectionToQtyMap(selectedAddons?.[si]);
    Object.entries(map).forEach(([id, qty]) => {
      const item = sec.items?.find((entry) => entry.id === id);
      if (!item?.name) return;
      labels.push(formatAddonOptLabel(item.name, qty));
    });
  });
  return labels;
}

export function getSectionMaxRepeticoes(section) {
  if (!section?.permitirRepetir) return 1;
  return Math.max(2, Math.floor(Number(section.maxRepeticoes) || 2));
}

/** Badge de progresso do passo (Falta N / ✓ X/Y), igual à marmita. */
export function getAddonStepBadge(section, selected = {}) {
  const min = section?.required
    ? Math.max(1, Number(section.min || 1))
    : Number(section?.min || 0);
  const max = Math.max(min, Number(section?.max || 1));
  const total = sectionTotalQty(selected);
  if (total < min) {
    return { text: `Falta ${min - total}`, tone: 'missing' };
  }
  return { text: `✓ ${total}/${max}`, tone: 'done' };
}

export function getAddonStepHint(section, { allowRepeat = false, maxRepeticoes = 1 } = {}) {
  const max = Math.max(1, Number(section?.max || 1));
  const base = `Escolha até ${max} ${max > 1 ? 'opções' : 'opção'}`;
  if (allowRepeat || section?.permitirRepetir) {
    const rep = Math.max(2, Number(maxRepeticoes || getSectionMaxRepeticoes(section)));
    return `${base} · até ${rep} iguais`;
  }
  return base;
}
