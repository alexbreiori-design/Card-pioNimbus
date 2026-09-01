import { buildAddonSections } from '@/lib/cardapio/addonSections';
import { isProductCategoryActive } from '@/lib/catalog/groupAvailability';
import {
  findFaixaForMember,
  resolveFaixaSectionName,
  sanitizeFaixasExibicao,
} from '@/lib/cardapio/faixasExibicao';
import {
  attachSectionKeys,
  buildProductSectionKey,
  collapseMembersToSections,
  mergeMarmitaSectionList,
} from '@/lib/cardapio/catalogSections';
import { expandMarmitasToProducts } from '@/lib/marmita/buildMarmitaCatalog';
import { expandPizzasToProducts } from '@/lib/pizza/buildPizzaCatalog';
import { PIZZA_CATEGORY_NAME, PIZZA_VIRTUAL_CATEGORY_ID } from '@/lib/pizza/pizzaIds';
import {
  MARMITA_VIRTUAL_CATEGORY_ID,
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
import { getActivePizzaCategorias, normalizePizzaCardapio } from '@/lib/pizza/pizzaModel';
import { normalizeMarmitaCardapio } from '@/lib/marmita/marmitaCardapio';
import { normalizeMarmitaGrupo } from '@/lib/marmita/marmitaModel';

function applyFaixaCategory(product, memberId, faixas, fallbackName, memberNamesById) {
  const faixa = findFaixaForMember(faixas, memberId);
  if (!faixa) {
    return { ...product, category: fallbackName };
  }
  const sectionName = resolveFaixaSectionName(faixa, {
    memberNamesById,
    fallbackName,
  });
  const memberIndex = Math.max(0, faixa.membroIds.indexOf(String(memberId)));
  return {
    ...product,
    category: sectionName,
    faixaId: faixa.id,
    sourceMemberId: memberId,
    itemOrdem: memberIndex * 1000 + (product.itemOrdem ?? 0),
  };
}

/** Converte JSON da loja em catálogo renderizável no cardápio público. */
export function buildCardapioCatalog(parsed) {
  const cats = (parsed.categorias || []).filter((c) => c.ativo !== false);
  const categoryOrder = new Map(cats.map((c, idx) => [c.id, idx]));

  const pizzaCardapio = normalizePizzaCardapio(resolvePizzaCardapioFromStore(parsed));
  const marmitaCardapio = normalizeMarmitaCardapio(parsed.marmitaCardapio);
  const faixasProdutos = sanitizeFaixasExibicao(
    parsed.faixasExibicao,
    cats.map((cat) => cat.id)
  );
  const faixasPizza = sanitizeFaixasExibicao(
    pizzaCardapio.faixasExibicao,
    (pizzaCardapio.categorias || []).map((cat) => cat.id)
  );
  const marmitaGruposAll = [...(parsed.marmitaGrupos || [])]
    .map(normalizeMarmitaGrupo)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const faixasMarmita = sanitizeFaixasExibicao(
    marmitaCardapio.faixasExibicao,
    marmitaGruposAll.map((grupo) => grupo.id)
  );

  const productMemberNames = new Map(cats.map((cat) => [String(cat.id), cat.nome || '']));
  const pizzaMemberNames = new Map(
    (pizzaCardapio.categorias || []).map((cat) => [String(cat.id), cat.nomePublico || ''])
  );
  const marmitaMemberNames = new Map(
    marmitaGruposAll.map((grupo) => [String(grupo.id), grupo.nome || ''])
  );

  const pizzaProducts = expandPizzasToProducts(parsed).map((product) => {
    const memberId = product.pizzaCategoriaId || product.pizzaConfig?.categoriaId || '';
    const fallback = product.category;
    return applyFaixaCategory(product, memberId, faixasPizza, fallback, pizzaMemberNames);
  });

  const regularProds = [...(parsed.produtos || [])]
    .filter(
      (p) =>
        p.ativo !== false &&
        isProductCategoryActive(parsed, p.categoriaId) &&
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
    .map((p) => {
      const cat = cats.find((c) => c.id === p.categoriaId);
      const fallbackName = cat?.nome || 'Sem categoria';
      const destaque = String(p.destaque || '').trim().slice(0, 15);
      const base = {
        id: p.id,
        categoryId: p.categoriaId,
        category: fallbackName,
        name: p.nome,
        desc: p.descricao || '',
        price: Number(p.preco || 0),
        priceLabel: p.precoApartirDe ? 'à partir de' : '',
        priceDisplayOnly: p.precoSoExibicao === true,
        highlightLabel: destaque,
        imageUrl: p.imagemUrl || '',
        addons: buildAddonSections(parsed, p.adicionais, '', p.adicionaisConfig, p.adicionaisPassos),
        type: p.tipo || 'comum',
        pizzaConfig: null,
        relatedProductIds: normalizePecaTambemIds(p.pecaTambemIds),
        itemOrdem: p.ordem ?? 0,
      };
      return applyFaixaCategory(base, p.categoriaId, faixasProdutos, fallbackName, productMemberNames);
    });

  const marmitaProds = expandMarmitasToProducts(parsed).map((product) => {
    const withOrdem = { ...product, itemOrdem: product.marmitaOrdem ?? 0 };
    const memberId = product.marmitaGrupoId || '';
    if (!memberId) return withOrdem;
    return applyFaixaCategory(
      withOrdem,
      memberId,
      faixasMarmita,
      product.category,
      marmitaMemberNames
    );
  });

  const marmitaPlacement = resolveMarmitaCatalogPlacement(parsed.marmitaCardapio, {
    hasVisibleMarmitas: marmitaProds.length > 0,
  });
  const visibleMarmitaProds = marmitaPlacement.visible ? marmitaProds : [];

  const sectionRank = new Map();
  let rankCursor = 0;
  const rememberSection = (name) => {
    if (!name || sectionRank.has(name)) return;
    sectionRank.set(name, rankCursor);
    rankCursor += 1;
  };

  const pizzaCollapsed = collapseMembersToSections(
    getActivePizzaCategorias(pizzaCardapio).map((cat) => ({
      id: cat.id,
      nome: cat.nomePublico,
      icone: 'pizza-01',
    })),
    faixasPizza,
    'pizza'
  );
  pizzaCollapsed.sections.forEach((section) => rememberSection(section.key));

  const productCollapsed = collapseMembersToSections(
    cats.map((cat) => ({ id: cat.id, nome: cat.nome, icone: cat.icone })),
    faixasProdutos,
    'product'
  );
  productCollapsed.sections.forEach((section) => rememberSection(section.key));

  const marmitaGrupos = marmitaGruposAll.filter((grupo) => grupo.ativo !== false);
  const marmitaCollapsed = collapseMembersToSections(
    marmitaGrupos.map((grupo) => ({
      id: grupo.id,
      nome: grupo.nome,
      icone: 'marmita',
    })),
    faixasMarmita,
    'marmita'
  );
  marmitaCollapsed.sections.forEach((section) => rememberSection(section.key));

  const prods = attachSectionKeys([...pizzaProducts, ...regularProds, ...visibleMarmitaProds]).sort((a, b) => {
    const aIsPizza = a.categoryId === PIZZA_VIRTUAL_CATEGORY_ID;
    const bIsPizza = b.categoryId === PIZZA_VIRTUAL_CATEGORY_ID;
    if (aIsPizza !== bIsPizza) return aIsPizza ? -1 : 1;
    const aIsMarmita = a.categoryId === MARMITA_VIRTUAL_CATEGORY_ID;
    const bIsMarmita = b.categoryId === MARMITA_VIRTUAL_CATEGORY_ID;
    if (aIsMarmita !== bIsMarmita) return aIsMarmita ? 1 : -1;

    const sectionCmp =
      (sectionRank.get(a.sectionKey) ?? sectionRank.get(a.category) ?? 9999) -
      (sectionRank.get(b.sectionKey) ?? sectionRank.get(b.category) ?? 9999);
    if (sectionCmp !== 0) return sectionCmp;

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
  const pizzaSectionKeys = pizzaCollapsed.sections.map((section) => section.key);

  const visibleSectionKeys = new Set(
    mergedProducts
      .filter((p) => p.category !== PROMO_CATEGORY_NAME)
      .map((p) => p.sectionKey || buildProductSectionKey(p))
  );
  const regularSectionKeys = productCollapsed.sections
    .map((section) => section.key)
    .filter((key) => visibleSectionKeys.has(key));
  const withPromos = prependPromoCategory(regularSectionKeys, hasPromos);
  const withoutLegacyPizza = withPromos.filter((key) => {
    if (pizzaSectionKeys.includes(key)) return false;
    if (key === PIZZA_CATEGORY_NAME && pizzaSectionKeys.length > 0) return false;
    return true;
  });
  const withPizza = pizzaSectionKeys.length
    ? [...pizzaSectionKeys.filter((key) => visibleSectionKeys.has(key)), ...withoutLegacyPizza]
    : withoutLegacyPizza;

  const marmitaSectionKeysInProducts = [
    ...new Set(
      visibleMarmitaProds.map((product) => product.sectionKey || buildProductSectionKey(product))
    ),
  ];
  const marmitaSectionKeys = marmitaCollapsed.sections
    .map((section) => section.key)
    .filter((key) => marmitaSectionKeysInProducts.includes(key));

  const categorySectionKeys = mergeMarmitaSectionList(
    withPizza,
    cats,
    marmitaPlacement,
    hasPromos,
    marmitaSectionKeys,
    faixasProdutos
  );

  const categoryLabelsByKey = {};
  const iconMap = {};
  const layoutMap = {};
  const marmitaGrupoLayoutsById = {};

  const registerSection = (section, { defaultIcon = 'burger', defaultLayout = CATEGORY_LAYOUT_DEFAULT } = {}) => {
    if (!section?.key) return;
    categoryLabelsByKey[section.key] = section.label || section.key;
    iconMap[section.key] = section.icon || defaultIcon;
    if (section.layout) layoutMap[section.key] = normalizeCategoryLayout(section.layout);
    else if (!layoutMap[section.key]) layoutMap[section.key] = defaultLayout;
  };

  productCollapsed.sections.forEach((section) => {
    const cat = cats.find((row) => section.key === `product:${row.id}`);
    registerSection(
      {
        ...section,
        icon: section.icon || cat?.icone || 'burger',
        layout: section.layout || cat?.exibicaoCardapio,
      },
      { defaultIcon: cat?.icone || 'burger', defaultLayout: normalizeCategoryLayout(cat?.exibicaoCardapio) }
    );
  });

  pizzaCollapsed.sections.forEach((section) => {
    const cat = getActivePizzaCategorias(pizzaCardapio).find((row) => section.key === `pizza:${row.id}`);
    registerSection(
      {
        ...section,
        icon: 'pizza-01',
        layout: section.layout || cat?.exibicaoCardapio,
      },
      { defaultIcon: 'pizza-01', defaultLayout: normalizeCategoryLayout(cat?.exibicaoCardapio) }
    );
  });

  marmitaCollapsed.sections.forEach((section) => {
    const grupoId = section.key.startsWith('marmita:') ? section.key.slice('marmita:'.length) : '';
    const grupo = marmitaGruposAll.find((row) => row.id === grupoId);
    const layout = normalizeCategoryLayout(grupo?.exibicaoCardapio);
    registerSection(
      {
        ...section,
        icon: 'marmita',
        layout: section.layout || grupo?.exibicaoCardapio,
      },
      { defaultIcon: 'marmita', defaultLayout: layout }
    );
    if (grupoId && grupo) marmitaGrupoLayoutsById[grupoId] = layout;
  });

  iconMap[PROMO_CATEGORY_NAME] = 'promo';
  layoutMap[PROMO_CATEGORY_NAME] = CATEGORY_LAYOUT_DEFAULT;
  categoryLabelsByKey[PROMO_CATEGORY_NAME] = PROMO_CATEGORY_NAME;

  categorySectionKeys.forEach((key) => {
    if (!categoryLabelsByKey[key]) {
      const product = mergedProducts.find(
        (row) => (row.sectionKey || buildProductSectionKey(row)) === key
      );
      categoryLabelsByKey[key] = product?.category || key;
    }
    iconMap[key] = iconMap[key] || 'burger';
    layoutMap[key] = layoutMap[key] || CATEGORY_LAYOUT_DEFAULT;
  });

  const productsWithKeys = attachSectionKeys(mergedProducts);

  return {
    products: productsWithKeys,
    promoCarouselProducts,
    categories: ['Todos', ...categorySectionKeys],
    categoryLabelsByKey,
    categoryIconsByName: iconMap,
    categoryLayoutsByName: layoutMap,
    marmitaGrupoLayoutsById,
    cupons: (parsed.cupons || []).filter((c) => c.ativo !== false),
  };
}
