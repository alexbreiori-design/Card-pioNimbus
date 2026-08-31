import { buildAddonSections } from '@/lib/cardapio/addonSections';
import { isProductCategoryActive } from '@/lib/catalog/groupAvailability';
import {
  findFaixaForMember,
  resolveFaixaSectionName,
  sanitizeFaixasExibicao,
} from '@/lib/cardapio/faixasExibicao';
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
import { getActivePizzaCategorias, normalizePizzaCardapio } from '@/lib/pizza/pizzaModel';
import { normalizeMarmitaCardapio } from '@/lib/marmita/marmitaCardapio';
import { normalizeMarmitaGrupo } from '@/lib/marmita/marmitaModel';

/**
 * Emite nomes de seção na ordem dos membros, colapsando faixas numa única entrada.
 * O nome da seção é o mesmo usado em applyFaixaCategory (senão produtos ficam órfãos).
 */
function collapseMembersToSectionNames(orderedMembers, faixas) {
  const memberNamesById = new Map(
    orderedMembers.map((member) => [String(member?.id || ''), member?.nome || ''])
  );
  const byMember = new Map();
  (faixas || []).forEach((faixa) => {
    (faixa.membroIds || []).forEach((id) => byMember.set(String(id), faixa));
  });

  const names = [];
  const seenFaixas = new Set();
  const layouts = {};
  const icons = {};

  orderedMembers.forEach((member) => {
    const memberId = String(member?.id || '');
    if (!memberId) return;
    const faixa = byMember.get(memberId);
    if (faixa) {
      if (seenFaixas.has(faixa.id)) return;
      seenFaixas.add(faixa.id);
      const nome = resolveFaixaSectionName(faixa, {
        memberNamesById,
        fallbackName: member.nome,
      });
      if (!nome) return;
      names.push(nome);
      layouts[nome] = faixa.layout;
      if (member.icone) icons[nome] = member.icone;
      return;
    }
    if (member.nome) names.push(member.nome);
  });

  return { names, layouts, icons, memberNamesById };
}

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

  const pizzaCollapsed = collapseMembersToSectionNames(
    getActivePizzaCategorias(pizzaCardapio).map((cat) => ({
      id: cat.id,
      nome: cat.nomePublico,
      icone: 'pizza-01',
    })),
    faixasPizza
  );
  pizzaCollapsed.names.forEach(rememberSection);

  const productCollapsed = collapseMembersToSectionNames(
    cats.map((cat) => ({ id: cat.id, nome: cat.nome, icone: cat.icone })),
    faixasProdutos
  );
  productCollapsed.names.forEach(rememberSection);

  const marmitaGrupos = marmitaGruposAll.filter((grupo) => grupo.ativo !== false);
  const marmitaCollapsed = collapseMembersToSectionNames(
    marmitaGrupos.map((grupo) => ({
      id: grupo.id,
      nome: grupo.nome,
      icone: 'marmita',
    })),
    faixasMarmita
  );
  marmitaCollapsed.names.forEach(rememberSection);

  const prods = [...pizzaProducts, ...regularProds, ...visibleMarmitaProds].sort((a, b) => {
    const aIsPizza = a.categoryId === PIZZA_VIRTUAL_CATEGORY_ID;
    const bIsPizza = b.categoryId === PIZZA_VIRTUAL_CATEGORY_ID;
    if (aIsPizza !== bIsPizza) return aIsPizza ? -1 : 1;
    const aIsMarmita = a.categoryId === MARMITA_VIRTUAL_CATEGORY_ID;
    const bIsMarmita = b.categoryId === MARMITA_VIRTUAL_CATEGORY_ID;
    if (aIsMarmita !== bIsMarmita) return aIsMarmita ? 1 : -1;

    const sectionCmp =
      (sectionRank.get(a.category) ?? 9999) - (sectionRank.get(b.category) ?? 9999);
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
  const pizzaCategoryNames = pizzaCollapsed.names;

  const visibleCategoryNames = new Set(
    mergedProducts.filter((p) => p.category !== PROMO_CATEGORY_NAME).map((p) => p.category)
  );
  const regularCategoryNames = productCollapsed.names.filter((name) =>
    visibleCategoryNames.has(name)
  );
  const withPromos = prependPromoCategory(regularCategoryNames, hasPromos);
  // Só remove a seção legada "Pizzas" quando o módulo pizza realmente emite seções.
  // Se o lojista nomear uma faixa de produtos como "Pizzas", ela deve permanecer.
  const withoutLegacyPizza = withPromos.filter((name) => {
    if (pizzaCategoryNames.includes(name)) return false;
    if (name === PIZZA_CATEGORY_NAME && pizzaCategoryNames.length > 0) return false;
    return true;
  });
  const withPizza = pizzaCategoryNames.length
    ? [...pizzaCategoryNames.filter((name) => visibleCategoryNames.has(name)), ...withoutLegacyPizza]
    : withoutLegacyPizza;

  const marmitaCategoriesInProducts = [
    ...new Set(visibleMarmitaProds.map((product) => product.category)),
  ];
  const marmitaSectionNames = marmitaCollapsed.names.filter((name) =>
    marmitaCategoriesInProducts.includes(name)
  );
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
  Object.entries(productCollapsed.layouts).forEach(([nome, layout]) => {
    layoutMap[nome] = layout;
  });
  Object.entries(productCollapsed.icons).forEach(([nome, icone]) => {
    iconMap[nome] = icone || iconMap[nome] || 'burger';
  });

  iconMap[PROMO_CATEGORY_NAME] = 'promo';
  layoutMap[PROMO_CATEGORY_NAME] = CATEGORY_LAYOUT_DEFAULT;

  getActivePizzaCategorias(pizzaCardapio).forEach((cat) => {
    if (!cat.nomePublico) return;
    iconMap[cat.nomePublico] = 'pizza-01';
    layoutMap[cat.nomePublico] = normalizeCategoryLayout(cat.exibicaoCardapio);
  });
  Object.entries(pizzaCollapsed.layouts).forEach(([nome, layout]) => {
    layoutMap[nome] = layout;
  });
  Object.entries(pizzaCollapsed.icons).forEach(([nome, icone]) => {
    iconMap[nome] = icone || 'pizza-01';
  });
  pizzaCollapsed.names.forEach((nome) => {
    iconMap[nome] = iconMap[nome] || 'pizza-01';
  });

  marmitaGruposAll.forEach((grupo) => {
    if (!grupo.nome) return;
    const layout = normalizeCategoryLayout(grupo.exibicaoCardapio);
    iconMap[grupo.nome] = 'marmita';
    layoutMap[grupo.nome] = layout;
    if (grupo.id) marmitaGrupoLayoutsById[grupo.id] = layout;
  });
  Object.entries(marmitaCollapsed.layouts).forEach(([nome, layout]) => {
    layoutMap[nome] = layout;
  });
  marmitaCollapsed.names.forEach((nome) => {
    iconMap[nome] = 'marmita';
  });

  const marmitaFallbackLayout =
    marmitaGrupos.length === 1
      ? normalizeCategoryLayout(marmitaGrupos[0].exibicaoCardapio)
      : CATEGORY_LAYOUT_DEFAULT;
  layoutMap[MARMITA_CATEGORY_NAME] = marmitaFallbackLayout;
  iconMap[MARMITA_CATEGORY_NAME] = 'marmita';

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
