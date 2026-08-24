function uid(prefix = 'passo') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function selectionFrom(value) {
  return {
    categoriaIds: Array.isArray(value?.categoriaIds) ? value.categoriaIds : [],
    itemIds: Array.isArray(value?.itemIds) ? value.itemIds : [],
  };
}

export function normalizeAddonRules(value) {
  const grupos =
    value && typeof value === 'object' && value.grupos && typeof value.grupos === 'object'
      ? value.grupos
      : {};
  return { grupos: { ...grupos } };
}

export function normalizeAddonPasso(passo = {}, index = 0) {
  const tipoSelecao = passo.tipoSelecao === 'multipla' ? 'multipla' : 'simples';
  const obrigatorio = passo.obrigatorio === true;
  let min = Number(passo.min ?? (obrigatorio ? 1 : 0));
  let max = Number(passo.max ?? (tipoSelecao === 'simples' ? 1 : 99));
  if (tipoSelecao === 'simples') {
    max = 1;
    min = obrigatorio ? 1 : Math.min(1, Math.max(0, min));
  } else {
    min = Math.max(0, min);
    max = Math.max(min || 1, max || 1);
  }

  const permitirRepetir = tipoSelecao === 'multipla' && passo.permitirRepetir === true;
  let maxRepeticoes = Math.max(2, Math.floor(Number(passo.maxRepeticoes) || 2));
  if (permitirRepetir) {
    maxRepeticoes = Math.min(maxRepeticoes, Math.max(2, max));
  }

  return {
    id: String(passo.id || uid('passo')),
    titulo: String(passo.titulo ?? ''),
    categoriaAdicionalId: String(passo.categoriaAdicionalId || '').trim(),
    itemIds: Array.isArray(passo.itemIds) ? passo.itemIds.filter(Boolean) : [],
    tipoSelecao,
    min,
    max,
    obrigatorio,
    permitirRepetir,
    maxRepeticoes: permitirRepetir ? maxRepeticoes : Math.max(2, Math.floor(Number(passo.maxRepeticoes) || 2)),
    exibirFotos: passo.exibirFotos !== false,
    ordem: Number(passo.ordem ?? index),
  };
}

export function normalizeAddonPassos(passos) {
  if (!Array.isArray(passos)) return [];
  return passos
    .map((passo, index) => normalizeAddonPasso(passo, index))
    .sort((a, b) => a.ordem - b.ordem)
    .map((passo, index) => ({ ...passo, ordem: index }));
}

/** Converte seleção legada (categoriaIds/itemIds + grupos) em passos ordenados. */
export function migrateLegacyAddonPassos({
  adicionais,
  adicionaisConfig,
  categories = [],
  items = [],
}) {
  const selected = selectionFrom(adicionais);
  const rules = normalizeAddonRules(adicionaisConfig);
  const catIds = new Set(selected.categoriaIds);
  selected.itemIds.forEach((itemId) => {
    const item = items.find((row) => row.id === itemId);
    if (item?.categoriaId) catIds.add(item.categoriaId);
  });

  return [...catIds]
    .map((catId, index) => {
      const cat = categories.find((row) => row.id === catId);
      if (!cat) return null;
      const baseItems = items.filter((item) => item.categoriaId === catId && item.ativo !== false);
      const itemIds = selected.categoriaIds.includes(catId)
        ? baseItems.map((item) => item.id)
        : baseItems.filter((item) => selected.itemIds.includes(item.id)).map((item) => item.id);
      if (!itemIds.length && !selected.categoriaIds.includes(catId)) return null;
      const rule = rules.grupos[catId] || {};
      const tipoSelecao =
        rule.tipoSelecao === 'simples' || rule.tipoSelecao === 'multipla'
          ? rule.tipoSelecao
          : cat.tipoSelecao === 'simples'
            ? 'simples'
            : 'multipla';
      return normalizeAddonPasso(
        {
          id: uid('passo'),
          titulo: cat.nome || 'Adicionais',
          categoriaAdicionalId: catId,
          itemIds,
          tipoSelecao,
          min: rule.min ?? cat.min ?? 0,
          max: rule.max ?? cat.max ?? (tipoSelecao === 'simples' ? 1 : 99),
          obrigatorio: rule.obrigatorio ?? cat.obrigatorio ?? false,
          ordem: index,
        },
        index
      );
    })
    .filter(Boolean);
}

export function resolveProductAddonPassos(product, { categories = [], items = [] } = {}) {
  const existing = normalizeAddonPassos(product?.adicionaisPassos);
  if (existing.length) return existing;
  return migrateLegacyAddonPassos({
    adicionais: product?.adicionais,
    adicionaisConfig: product?.adicionaisConfig,
    categories,
    items,
  });
}

/** Sincroniza passos → seleção flat + config (compatibilidade) e retorna payload. */
export function syncAddonPassosToSelection(passos, { items = [] } = {}) {
  const normalized = normalizeAddonPassos(passos).map((passo) => ({
    ...passo,
    titulo: passo.titulo.trim(),
  }));
  const categoriaIds = [];
  const itemIds = [];
  const grupos = {};

  normalized.forEach((passo) => {
    const catId = passo.categoriaAdicionalId;
    if (!catId) return;
    const baseItems = items.filter((item) => item.categoriaId === catId && item.ativo !== false);
    const selectedIds = passo.itemIds.filter((id) => baseItems.some((item) => item.id === id));
    const allSelected =
      baseItems.length > 0 && selectedIds.length === baseItems.length && selectedIds.length > 0;

    if (allSelected) {
      if (!categoriaIds.includes(catId)) categoriaIds.push(catId);
    } else {
      selectedIds.forEach((id) => {
        if (!itemIds.includes(id)) itemIds.push(id);
      });
    }

    grupos[catId] = {
      ...(grupos[catId] || {}),
      tipoSelecao: passo.tipoSelecao,
      min: passo.min,
      max: passo.max,
      obrigatorio: passo.obrigatorio === true,
      permitirRepetir: passo.permitirRepetir === true,
      maxRepeticoes: passo.maxRepeticoes,
      itens: grupos[catId]?.itens || {},
    };
  });

  return {
    adicionaisPassos: normalized,
    adicionais: { categoriaIds, itemIds },
    adicionaisConfig: { grupos },
  };
}
