export const CATEGORY_LAYOUT_DEFAULT = 'grid-4';

export const CATEGORY_LAYOUT_OPTIONS = [
  {
    id: 'grid-3',
    label: 'Grid maior',
    description: '3 itens por linha',
    visibleCount: 3,
    gridColumns: 3,
    mobileVisibleCount: 2,
    mobileGridColumns: 1,
    mode: 'grid',
  },
  {
    id: 'grid-4',
    label: 'Grid padrão',
    description: '4 itens por linha',
    visibleCount: 4,
    gridColumns: 4,
    mobileVisibleCount: 2,
    mobileGridColumns: 2,
    mode: 'grid',
  },
  {
    id: 'grid-5',
    label: 'Grid menor',
    description: '5 itens por linha',
    visibleCount: 5,
    gridColumns: 5,
    mobileVisibleCount: 3,
    mobileGridColumns: 3,
    mode: 'grid',
  },
  {
    id: 'lista',
    label: 'Lista',
    description: '2 colunas, cards horizontais',
    visibleCount: 4,
    gridColumns: 2,
    mobileVisibleCount: 3,
    mobileGridColumns: 1,
    mode: 'lista',
  },
];

const VALID_LAYOUT_IDS = new Set(CATEGORY_LAYOUT_OPTIONS.map((option) => option.id));

export function normalizeCategoryLayout(value) {
  return VALID_LAYOUT_IDS.has(value) ? value : CATEGORY_LAYOUT_DEFAULT;
}

export function getCategoryLayoutConfig(layoutId) {
  const id = normalizeCategoryLayout(layoutId);
  return (
    CATEGORY_LAYOUT_OPTIONS.find((option) => option.id === id) ||
    CATEGORY_LAYOUT_OPTIONS.find((option) => option.id === CATEGORY_LAYOUT_DEFAULT)
  );
}

/** Resolve contagens/colunas para o viewport atual (cardápio v2 mobile < 1100px). */
export function resolveCategoryLayout(layoutId, { mobile = false } = {}) {
  const config = getCategoryLayoutConfig(layoutId);
  if (!mobile) return config;
  return {
    ...config,
    visibleCount: config.mobileVisibleCount ?? config.visibleCount,
    gridColumns: config.mobileGridColumns ?? config.gridColumns,
  };
}

/** Layout de exibição para seção de marmitas (por grupoId, depois nome da categoria). */
export function resolveMarmitaSectionLayout(categoryName, items, layouts = {}) {
  const { categoryLayoutsByName = {}, marmitaGrupoLayoutsById = {} } = layouts;
  const grupoIds = [
    ...new Set(
      (items || [])
        .map((item) => String(item?.marmitaGrupoId || '').trim())
        .filter(Boolean)
    ),
  ];

  if (grupoIds.length === 1 && marmitaGrupoLayoutsById[grupoIds[0]]) {
    return normalizeCategoryLayout(marmitaGrupoLayoutsById[grupoIds[0]]);
  }

  return normalizeCategoryLayout(categoryLayoutsByName[categoryName] || CATEGORY_LAYOUT_DEFAULT);
}
