import { resolveAddonItemPrice } from '@/lib/addonPricing';
import { expandMarmitasToProducts } from '@/lib/marmita/buildMarmitaCatalog';
import {
  MARMITA_CATEGORY_NAME,
  MARMITA_VIRTUAL_CATEGORY_ID,
  mergeMarmitaCategoryList,
  resolveMarmitaCatalogPlacement,
} from '@/lib/marmita/marmitaCardapio';
import { normalizePecaTambemIds } from '@/lib/productSuggestions';
import {
  mergePromocoesIntoCardapio,
  prependPromoCategory,
  PROMO_CATEGORY_NAME,
} from '@/lib/promocoes';

function normalizeSelection(selection) {
  return {
    categoriaIds: Array.isArray(selection?.categoriaIds) ? selection.categoriaIds : [],
    itemIds: Array.isArray(selection?.itemIds) ? selection.itemIds : [],
  };
}

function buildAddonSections(parsed, selection, sectionTitlePrefix = '', config = null) {
  const safe = normalizeSelection(selection);
  const sections = [];
  const activeAddons = (parsed.adicionaisItens || []).filter((item) => item.ativo !== false);
  const addonByCategory = new Map();
  activeAddons.forEach((item) => {
    if (!addonByCategory.has(item.categoriaId)) addonByCategory.set(item.categoriaId, []);
    addonByCategory.get(item.categoriaId).push(item);
  });

  safe.categoriaIds.forEach((categoryId) => {
    const category = (parsed.adicionaisCategorias || []).find(
      (cat) => cat.id === categoryId && cat.ativo !== false
    );
    if (!category) return;
    const productRule = config?.grupos?.[categoryId] || {};
    const rule = {
      tipoSelecao: productRule.tipoSelecao || category.tipoSelecao || 'multipla',
      min: productRule.min ?? category.min ?? 0,
      max: productRule.max ?? category.max ?? 99,
      obrigatorio: productRule.obrigatorio ?? category.obrigatorio ?? false,
      itens: productRule.itens || {},
    };
    const items = (addonByCategory.get(categoryId) || []).map((item) => ({
      id: item.id,
      name: item.nome,
      desc: item.descricao || '',
      extra: resolveAddonItemPrice(item, config, categoryId),
      imageUrl: item.imagemUrl || '',
    }));
    if (!items.length) return;
    sections.push({
      section: `${sectionTitlePrefix}${category.nome}`,
      required: rule.obrigatorio === true,
      min: Number(rule.min || 0),
      max: Math.max(1, Number(rule.max || items.length)),
      items,
    });
  });

  const singles = safe.itemIds
    .map((id) => activeAddons.find((item) => item.id === id))
    .filter(Boolean)
    .map((item) => ({
      id: item.id,
      name: item.nome,
      desc: item.descricao || '',
      extra: resolveAddonItemPrice(item, config, item.categoriaId),
      imageUrl: item.imagemUrl || '',
    }));

  if (singles.length) {
    sections.push({
      section: `${sectionTitlePrefix}Selecionados`,
      required: false,
      min: 0,
      max: singles.length,
      items: singles,
    });
  }

  return sections;
}

/** Converte JSON da loja em catálogo renderizável no cardápio público. */
export function buildCardapioCatalog(parsed) {
  const cats = (parsed.categorias || []).filter((c) => c.ativo);
  const categoryOrder = new Map(cats.map((c, idx) => [c.id, idx]));

  const sizeLookup = new Map(
    (parsed.produtos || [])
      .filter((item) => item.tipo === 'tamanho_pizza')
      .map((item) => [item.id, { nome: item.nome, preco: Number(item.preco || 0) }])
  );

  const regularProds = [...(parsed.produtos || [])]
    .filter((p) => p.ativo !== false && p.tipo !== 'marmita' && p.tipo !== 'tamanho_pizza')
    .sort((a, b) => {
      const catCmp = (categoryOrder.get(a.categoriaId) ?? 9999) - (categoryOrder.get(b.categoriaId) ?? 9999);
      if (catCmp !== 0) return catCmp;
      return (a.ordem ?? 0) - (b.ordem ?? 0);
    })
    .map((p) => {
      const pizzaConfig = p.pizzaConfig
        ? {
            ...p.pizzaConfig,
            tamanhoConfig: (p.pizzaConfig.tamanhoConfig || []).map((sizeCfg) => ({
              ...sizeCfg,
              tamanhoNome: sizeLookup.get(sizeCfg.tamanhoId)?.nome || sizeCfg.tamanhoId,
              tamanhoPreco: sizeLookup.get(sizeCfg.tamanhoId)?.preco || 0,
            })),
          }
        : null;
      return {
        id: p.id,
        categoryId: p.categoriaId,
        category: cats.find((c) => c.id === p.categoriaId)?.nome || 'Sem categoria',
        name: p.nome,
        desc: p.descricao || '',
        price: Number(p.preco || 0),
        imageUrl: p.imagemUrl || '',
        addons: buildAddonSections(parsed, p.adicionais, '', p.adicionaisConfig),
        type: p.tipo || 'comum',
        pizzaConfig,
        relatedProductIds: normalizePecaTambemIds(p.pecaTambemIds),
        itemOrdem: p.ordem ?? 0,
      };
    });

  const marmitaProds = expandMarmitasToProducts(parsed).map((product) => ({
    ...product,
    itemOrdem: product.marmitaOrdem ?? 0,
  }));

  const marmitaPlacement = resolveMarmitaCatalogPlacement(parsed.marmitaCardapio, {
    hasVisibleMarmitas: marmitaProds.length > 0,
  });
  const visibleMarmitaProds = marmitaPlacement.visible ? marmitaProds : [];

  const prods = [...regularProds, ...visibleMarmitaProds].sort((a, b) => {
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

  const { products: mergedProducts, promoCarouselProducts = [] } = mergePromocoesIntoCardapio(
    prods,
    parsed.promocoes,
    parsed.produtos
  );
  const hasPromos = promoCarouselProducts.length > 0;
  const visibleCategoryNames = new Set(
    mergedProducts
      .filter((p) => p.category !== PROMO_CATEGORY_NAME && p.category !== MARMITA_CATEGORY_NAME)
      .map((p) => p.category)
  );
  const regularCategoryNames = cats
    .map((c) => c.nome)
    .filter((name) => visibleCategoryNames.has(name));
  const withPromos = prependPromoCategory(regularCategoryNames, hasPromos);
  const categoryNames = mergeMarmitaCategoryList(
    withPromos,
    cats,
    marmitaPlacement,
    hasPromos
  );

  const iconMap = {};
  cats.forEach((c) => {
    iconMap[c.nome] = c.icone || 'burger';
  });
  iconMap[PROMO_CATEGORY_NAME] = 'promo';
  iconMap[MARMITA_CATEGORY_NAME] = 'combo';

  return {
    products: mergedProducts,
    promoCarouselProducts,
    categories: ['Todos', ...categoryNames],
    categoryIconsByName: iconMap,
    cupons: (parsed.cupons || []).filter((c) => c.ativo !== false),
  };
}
