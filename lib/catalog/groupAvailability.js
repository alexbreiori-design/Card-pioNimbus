/** Desativa todos os itens de um grupo ao desligar a categoria/grupo no admin. */
export function applyCatalogGroupToggle(prev, { catKey, itemKey, groupId, active }) {
  const next = {
    ...prev,
    [catKey]: (prev[catKey] || []).map((row) =>
      row.id === groupId ? { ...row, ativo: active } : row
    ),
  };

  if (active === false) {
    next[itemKey] = (prev[itemKey] || []).map((item) =>
      item.categoriaId === groupId ? { ...item, ativo: false } : item
    );
  }

  return next;
}

/**
 * Liga/desliga um item. Ao ligar, reativa o grupo — só este item fica ativo;
 * os demais do grupo permanecem como estavam.
 */
export function applyCatalogItemToggle(prev, { catKey, itemKey, itemId, active }) {
  const items = prev[itemKey] || [];
  const item = items.find((row) => row.id === itemId);
  const next = {
    ...prev,
    [itemKey]: items.map((row) => (row.id === itemId ? { ...row, ativo: active } : row)),
  };

  if (active && item?.categoriaId) {
    next[catKey] = (prev[catKey] || []).map((row) =>
      row.id === item.categoriaId ? { ...row, ativo: true } : row
    );
  }

  return next;
}

/** Desativa todas as marmitas do grupo ao desligar o grupo no admin. */
export function applyMarmitaGrupoToggle(prev, grupoId, active) {
  const next = {
    ...prev,
    marmitaGrupos: (prev.marmitaGrupos || []).map((row) =>
      row.id === grupoId ? { ...row, ativo: active } : row
    ),
  };

  if (active === false) {
    next.marmitas = (prev.marmitas || []).map((row) =>
      row.grupoId === grupoId ? { ...row, ativo: false } : row
    );
  }

  return next;
}

/** Liga/desliga marmita; ao ligar, reativa o grupo sem alterar as outras. */
export function applyMarmitaItemToggle(prev, itemId, active) {
  const items = prev.marmitas || [];
  const item = items.find((row) => row.id === itemId);
  const next = {
    ...prev,
    marmitas: items.map((row) => (row.id === itemId ? { ...row, ativo: active } : row)),
  };

  if (active && item?.grupoId) {
    next.marmitaGrupos = (prev.marmitaGrupos || []).map((row) =>
      row.id === item.grupoId ? { ...row, ativo: true } : row
    );
  }

  return next;
}

export function isCatalogItemUnavailable(item, categoriesById) {
  if (item?.ativo === false) return true;
  const categoryId = item?.categoriaId;
  if (!categoryId) return false;
  const category = categoriesById.get(categoryId);
  return category != null && category.ativo === false;
}

export function isMarmitaItemUnavailable(item, gruposById) {
  if (item?.ativo === false) return true;
  const grupoId = item?.grupoId;
  if (!grupoId) return false;
  const grupo = gruposById.get(grupoId);
  return grupo != null && grupo.ativo === false;
}

export function isProductCategoryActive(parsed, categoriaId) {
  if (!categoriaId) return true;
  const category = (parsed.categorias || []).find((row) => row.id === categoriaId);
  return category == null || category.ativo !== false;
}
