import { emptyPizzaCardapio } from '@/lib/pizza/pizzaModel';
import { normalizeCategoryLayout } from '@/lib/cardapio/categoryLayouts';
import { normalizeFaixasExibicao } from '@/lib/cardapio/faixasExibicao';
import {
  addonCategoryFromRow,
  addonItemFromRow,
  categoryFromRow,
  productFromRow,
} from '@/lib/catalog/catalogRowMappers';
import { cupomFromRow } from '@/lib/catalog/cupomRowMappers';
import {
  pizzaCategoriaFromRow,
  pizzaSaborFromRow,
  pizzaTamanhoFromRow,
} from '@/lib/catalog/pizzaRowMappers';
import {
  marmitaFromRow,
  marmitaGrupoFromRow,
} from '@/lib/catalog/marmitaRowMappers';

function moduleData(modules, name) {
  const row = (modules || []).find((item) => item.module === name);
  return row?.data && typeof row.data === 'object' ? row.data : {};
}

function readFaixasBundle(promos) {
  const raw = promos?.faixasExibicao;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { produtos: [], pizza: [], marmita: [] };
  }
  return {
    produtos: normalizeFaixasExibicao(raw.produtos),
    pizza: normalizeFaixasExibicao(raw.pizza),
    marmita: normalizeFaixasExibicao(raw.marmita),
  };
}

function buildPizzaCardapio({
  pizzaTamanhos = [],
  pizzaSabores = [],
  pizzaCategorias = [],
  modules = [],
  faixasPizza = [],
}) {
  const legacyPizza = moduleData(modules, 'pizza');

  const hasRows =
    pizzaTamanhos.length > 0 || pizzaSabores.length > 0 || pizzaCategorias.length > 0;

  if (hasRows) {
    return {
      tamanhos: pizzaTamanhos.map(pizzaTamanhoFromRow),
      sabores: pizzaSabores.map(pizzaSaborFromRow),
      categorias: pizzaCategorias.map(pizzaCategoriaFromRow),
      faixasExibicao: faixasPizza,
    };
  }

  const legacy = legacyPizza.pizzaCardapio || emptyPizzaCardapio();
  return {
    ...legacy,
    faixasExibicao: normalizeFaixasExibicao(legacy.faixasExibicao || faixasPizza),
  };
}

/** Monta o estado admin a partir das tabelas modulares. */
export function assembleStoreState({
  storeConfig = {},
  categorias = [],
  produtos = [],
  addonCategories = [],
  addonItems = [],
  pizzaTamanhos = [],
  pizzaSabores = [],
  pizzaCategorias = [],
  marmitaGrupos = [],
  marmitas = [],
  marmitaCardapio = {},
  modules = [],
  cupons = [],
}) {
  const legacyPizza = moduleData(modules, 'pizza');
  const legacyMarmita = moduleData(modules, 'marmita');
  const promos = moduleData(modules, 'promos');
  const layoutByCategoryId = promos.categoryLayouts?.byCategoryId || {};
  const layoutByGrupoId = promos.categoryLayouts?.byGrupoId || {};
  const faixasBundle = readFaixasBundle(promos);

  const hasMarmitaRows = marmitaGrupos.length > 0 || marmitas.length > 0;
  const hasMarmitaSettings =
    marmitaCardapio && typeof marmitaCardapio === 'object' && Object.keys(marmitaCardapio).length > 0;

  const baseMarmitaCardapio = hasMarmitaSettings
    ? marmitaCardapio
    : legacyMarmita.marmitaCardapio || {};

  return {
    _meta: storeConfig._meta || {},
    loja: storeConfig.loja || {},
    categorias: categorias.map((row) => categoryFromRow(row, layoutByCategoryId)),
    produtos: produtos.map(productFromRow),
    adicionaisCategorias: addonCategories.map(addonCategoryFromRow),
    adicionaisItens: addonItems.map(addonItemFromRow),
    faixasExibicao: faixasBundle.produtos,
    pizzaCardapio: buildPizzaCardapio({
      pizzaTamanhos,
      pizzaSabores,
      pizzaCategorias,
      modules,
      faixasPizza: faixasBundle.pizza,
    }),
    pizzas: Array.isArray(legacyPizza.pizzas) ? legacyPizza.pizzas : undefined,
    marmitas: hasMarmitaRows
      ? marmitas.map(marmitaFromRow)
      : Array.isArray(legacyMarmita.marmitas)
        ? legacyMarmita.marmitas
        : [],
    marmitaGrupos: hasMarmitaRows
      ? marmitaGrupos.map((row) => marmitaGrupoFromRow(row, layoutByGrupoId))
      : Array.isArray(legacyMarmita.marmitaGrupos)
        ? legacyMarmita.marmitaGrupos
        : [],
    marmitaCardapio: {
      ...baseMarmitaCardapio,
      faixasExibicao: normalizeFaixasExibicao(
        Array.isArray(baseMarmitaCardapio.faixasExibicao) &&
          baseMarmitaCardapio.faixasExibicao.length
          ? baseMarmitaCardapio.faixasExibicao
          : faixasBundle.marmita
      ),
    },
    promocoes: Array.isArray(promos.promocoes) ? promos.promocoes : [],
    cupons: cupons.map(cupomFromRow),
    clientes: Array.isArray(storeConfig.clientes) ? storeConfig.clientes : [],
    pedidos: [],
  };
}

export function extractStoreConfig(state) {
  return {
    loja: state?.loja || {},
    _meta: state?._meta || {},
    clientes: Array.isArray(state?.clientes) ? state.clientes : [],
  };
}

export function extractPizzaFromState(state) {
  const cardapio = state?.pizzaCardapio || emptyPizzaCardapio();
  return {
    tamanhos: Array.isArray(cardapio.tamanhos) ? cardapio.tamanhos : [],
    sabores: Array.isArray(cardapio.sabores) ? cardapio.sabores : [],
    categorias: Array.isArray(cardapio.categorias) ? cardapio.categorias : [],
    faixasExibicao: normalizeFaixasExibicao(cardapio.faixasExibicao),
    pizzas: Array.isArray(state?.pizzas) ? state.pizzas : undefined,
  };
}

export function extractMarmitaFromState(state) {
  return {
    grupos: Array.isArray(state?.marmitaGrupos) ? state.marmitaGrupos : [],
    marmitas: Array.isArray(state?.marmitas) ? state.marmitas : [],
    cardapio: state?.marmitaCardapio && typeof state.marmitaCardapio === 'object' ? state.marmitaCardapio : {},
  };
}

export function extractCatalogModules(state) {
  const byCategoryId = {};
  (state?.categorias || []).forEach((category) => {
    if (!category?.id) return;
    byCategoryId[category.id] = normalizeCategoryLayout(category.exibicaoCardapio);
  });

  const byGrupoId = {};
  (state?.marmitaGrupos || []).forEach((grupo) => {
    if (!grupo?.id) return;
    byGrupoId[grupo.id] = normalizeCategoryLayout(grupo.exibicaoCardapio);
  });

  return [
    {
      module: 'promos',
      data: {
        promocoes: state?.promocoes || [],
        categoryLayouts: { byCategoryId, byGrupoId },
        faixasExibicao: {
          produtos: normalizeFaixasExibicao(state?.faixasExibicao),
          pizza: normalizeFaixasExibicao(state?.pizzaCardapio?.faixasExibicao),
          marmita: normalizeFaixasExibicao(state?.marmitaCardapio?.faixasExibicao),
        },
      },
    },
  ];
}
