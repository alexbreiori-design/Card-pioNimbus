import { resolveAddonItemPrice } from '@/lib/addonPricing';
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

  const prods = [...(parsed.produtos || [])]
    .filter((p) => p.ativo)
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
        category: cats.find((c) => c.id === p.categoriaId)?.nome || 'Sem categoria',
        name: p.nome,
        desc: p.descricao || '',
        price: Number(p.preco || 0),
        imageUrl: p.imagemUrl || '',
        addons: buildAddonSections(parsed, p.adicionais, '', p.adicionaisConfig),
        type: p.tipo || 'comum',
        pizzaConfig,
        relatedProductIds: normalizePecaTambemIds(p.pecaTambemIds),
      };
    });

  const { products: mergedProducts, promoCarouselProducts } = mergePromocoesIntoCardapio(
    prods,
    parsed.promocoes,
    parsed.produtos
  );
  const hasPromos = promoCarouselProducts.length > 0;
  const categoryNames = prependPromoCategory(
    cats.map((c) => c.nome),
    hasPromos
  );

  const iconMap = {};
  cats.forEach((c) => {
    iconMap[c.nome] = c.icone || 'burger';
  });
  iconMap[PROMO_CATEGORY_NAME] = 'promo';

  return {
    products: mergedProducts,
    promoCarouselProducts,
    categories: ['Todos', ...categoryNames],
    categoryIconsByName: iconMap,
    cupons: (parsed.cupons || []).filter((c) => c.ativo !== false),
  };
}
