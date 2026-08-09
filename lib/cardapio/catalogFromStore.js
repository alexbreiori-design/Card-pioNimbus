import { buildAddonSections } from '@/lib/cardapio/addonSections';
import { expandMarmitasToProducts } from '@/lib/marmita/buildMarmitaCatalog';
import { expandPizzasToProducts } from '@/lib/pizza/buildPizzaCatalog';
import { PIZZA_CATEGORY_NAME, PIZZA_VIRTUAL_CATEGORY_ID } from '@/lib/pizza/pizzaIds';
import {
  MARMITA_CATEGORY_NAME,
  MARMITA_VIRTUAL_CATEGORY_ID,
  mergeMarmitaCategoryList,
  resolveMarmitaCatalogPlacement,
} from '@/lib/marmita/marmitaCardapio';
import { normalizePecaTambemIds } from '@/lib/productSuggestions';
import { expandPizzaSaboresToPromoProducts } from '@/lib/admin/buildAdminCatalogProducts';
import {
  mergePromocoesIntoCardapio,
  prependPromoCategory,
  PROMO_CATEGORY_NAME,
} from '@/lib/promocoes';
import { CATEGORY_LAYOUT_DEFAULT, normalizeCategoryLayout } from '@/lib/cardapio/categoryLayouts';
import { resolvePizzaCardapioFromStore } from '@/lib/pizza/pizzaCardapioResolve';
import { getActivePizzaCategorias } from '@/lib/pizza/pizzaModel';
import { normalizeMarmitaCardapio } from '@/lib/marmita/marmitaCardapio';
import { normalizeMarmitaGrupo } from '@/lib/marmita/marmitaModel';

/** Converte JSON da loja em catálogo renderizável no cardápio público. */
export function buildCardapioCatalog(parsed) {
  const cats = (parsed.categorias || []).filter((c) => c.ativo);
  const categoryOrder = new Map(cats.map((c, idx) => [c.id, idx]));

  const pizzaProducts = expandPizzasToProducts(parsed);

  const regularProds = [...(parsed.produtos || [])]
    .filter(
      (p) =>
        p.ativo !== false &&
        p.tipo !== 'marmita' &&
        p.tipo !== 'tamanho_pizza' &&
        p.tipo !== 'pizza' &&
        !p.tags?.includes('pizza')
    )
    .sort((a, b) => {
      const catCmp = (categoryOrder.get(a.categoriaId) ?? 9999) - (categoryOrder.get(b.categoriaId) ?? 9999);
      if (catCmp !== 0) return catCmp;
      return (a.ordem ?? 0) - (b.ordem ?? 0);
    })
    .map((p) => ({
      id: p.id,
      categoryId: p.categoriaId,
      category: cats.find((c) => c.id === p.categoriaId)?.nome || 'Sem categoria',
      name: p.nome,
      desc: p.descricao || '',
      price: Number(p.preco || 0),
      imageUrl: p.imagemUrl || '',
      addons: buildAddonSections(parsed, p.adicionais, '', p.adicionaisConfig, p.adicionaisPassos),
      type: p.tipo || 'comum',
      pizzaConfig: null,
      relatedProductIds: normalizePecaTambemIds(p.pecaTambemIds),
      itemOrdem: p.ordem ?? 0,
    }));

  const marmitaProds = expandMarmitasToProducts(parsed).map((product) => ({
    ...product,
    itemOrdem: product.marmitaOrdem ?? 0,
  }));

  const marmitaPlacement = resolveMarmitaCatalogPlacement(parsed.marmitaCardapio, {
    hasVisibleMarmitas: marmitaProds.length > 0,
  });
  const visibleMarmitaProds = marmitaPlacement.visible ? marmitaProds : [];

  const prods = [...pizzaProducts, ...regularProds, ...visibleMarmitaProds].sort((a, b) => {
    const aIsPizza = a.categoryId === PIZZA_VIRTUAL_CATEGORY_ID;
    const bIsPizza = b.categoryId === PIZZA_VIRTUAL_CATEGORY_ID;
    if (aIsPizza !== bIsPizza) return aIsPizza ? -1 : 1;
    const aIsMarmita = a.categoryId === MARMITA_VIRTUAL_CATEGORY_ID;
    const bIsMarmita = b.categoryId === MARMITA_VIRTUAL_CATEGORY_ID;
    if (aIsMarmita !== bIsMarmita) return aIsMarmita ? 1 : -1;
    const catCmp =
      (categoryOrder.get(a.categoryId) ?? 9999) - (categoryOrder.get(b.categoryId) ?? 9999);
    if (catCmp !== 0) return catCmp;
    const itemCmp = (a.itemOrdem ?? 0) - (b.itemOrdem ?? 0);
    if (itemCmp !== 0) return itemCmp;
    return (a.tamanhoOrdem ?? 0) - (b.tamanhoOrdem ?? 0);
  });

  const pizzaPromoProducts = expandPizzaSaboresToPromoProducts(parsed);
  const validPromoProductIds = [
    ...(parsed.produtos || []).filter((item) => item.ativo !== false).map((item) => item.id),
    ...pizzaPromoProducts.map((item) => item.id),
    ...prods.map((item) => item.id),
  ];

  const { products: mergedProducts, promoCarouselProducts = [] } = mergePromocoesIntoCardapio(
    prods,
    parsed.promocoes,
    validPromoProductIds,
    pizzaPromoProducts
  );
  const hasPromos = promoCarouselProducts.length > 0;
  const pizzaCardapio = resolvePizzaCardapioFromStore(parsed);
  const activePizzaCats = getActivePizzaCategorias(pizzaCardapio);
  const pizzaCategoryNames = activePizzaCats.map((cat) => cat.nomePublico).filter(Boolean);

  const visibleCategoryNames = new Set(
    mergedProducts.filter((p) => p.category !== PROMO_CATEGORY_NAME).map((p) => p.category)
  );
  const regularCategoryNames = cats
    .map((c) => c.nome)
    .filter((name) => visibleCategoryNames.has(name));
  const withPromos = prependPromoCategory(regularCategoryNames, hasPromos);
  const withoutLegacyPizza = withPromos.filter(
    (name) => name !== PIZZA_CATEGORY_NAME && !pizzaCategoryNames.includes(name)
  );
  const withPizza = pizzaCategoryNames.length
    ? [...pizzaCategoryNames, ...withoutLegacyPizza]
    : withoutLegacyPizza;

  const marmitaGrupos = [...(parsed.marmitaGrupos || [])]
    .map(normalizeMarmitaGrupo)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const marmitaCategoriesInProducts = [
    ...new Set(visibleMarmitaProds.map((product) => product.category)),
  ];
  const marmitaSectionNames = marmitaGrupos
    .filter((grupo) => grupo.ativo !== false && marmitaCategoriesInProducts.includes(grupo.nome))
    .map((grupo) => grupo.nome);
  if (
    marmitaCategoriesInProducts.includes(MARMITA_CATEGORY_NAME) &&
    !marmitaSectionNames.includes(MARMITA_CATEGORY_NAME)
  ) {
    marmitaSectionNames.push(MARMITA_CATEGORY_NAME);
  }

  const categoryNames = mergeMarmitaCategoryList(
    withPizza,
    cats,
    marmitaPlacement,
    hasPromos,
    marmitaSectionNames
  );

  const iconMap = {};
  const layoutMap = {};
  const marmitaGrupoLayoutsById = {};
  cats.forEach((c) => {
    iconMap[c.nome] = c.icone || 'burger';
    layoutMap[c.nome] = normalizeCategoryLayout(c.exibicaoCardapio);
  });
  iconMap[PROMO_CATEGORY_NAME] = 'promo';
  layoutMap[PROMO_CATEGORY_NAME] = CATEGORY_LAYOUT_DEFAULT;

  activePizzaCats.forEach((cat) => {
    if (!cat.nomePublico) return;
    iconMap[cat.nomePublico] = 'pizza';
    layoutMap[cat.nomePublico] = normalizeCategoryLayout(cat.exibicaoCardapio);
  });

  marmitaGrupos.forEach((grupo) => {
    if (!grupo.nome) return;
    const layout = normalizeCategoryLayout(grupo.exibicaoCardapio);
    iconMap[grupo.nome] = grupo.icone || 'combo';
    layoutMap[grupo.nome] = layout;
    if (grupo.id) marmitaGrupoLayoutsById[grupo.id] = layout;
  });

  const marmitaFallbackLayout =
    marmitaGrupos.length === 1
      ? normalizeCategoryLayout(marmitaGrupos[0].exibicaoCardapio)
      : CATEGORY_LAYOUT_DEFAULT;
  layoutMap[MARMITA_CATEGORY_NAME] = marmitaFallbackLayout;

  return {
    products: mergedProducts,
    promoCarouselProducts,
    categories: ['Todos', ...categoryNames],
    categoryIconsByName: iconMap,
    categoryLayoutsByName: layoutMap,
    marmitaGrupoLayoutsById,
    cupons: (parsed.cupons || []).filter((c) => c.ativo !== false),
  };
}
