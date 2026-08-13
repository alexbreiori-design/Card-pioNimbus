import { resolveAddonItemPrice } from '@/lib/addonPricing';

function normalizeSelection(selection) {
  return {
    categoriaIds: Array.isArray(selection?.categoriaIds) ? selection.categoriaIds : [],
    itemIds: Array.isArray(selection?.itemIds) ? selection.itemIds : [],
  };
}

export function buildAddonSectionsFromPassos(parsed, passos, config = null) {
  const sections = [];
  const activeAddons = (parsed.adicionaisItens || []).filter((item) => item.ativo !== false);
  const addonByCategory = new Map();
  activeAddons.forEach((item) => {
    if (!addonByCategory.has(item.categoriaId)) addonByCategory.set(item.categoriaId, []);
    addonByCategory.get(item.categoriaId).push(item);
  });

  (Array.isArray(passos) ? passos : []).forEach((passo) => {
    const categoryId = passo?.categoriaAdicionalId;
    if (!categoryId) return;
    const category = (parsed.adicionaisCategorias || []).find(
      (cat) => cat.id === categoryId && cat.ativo !== false
    );
    if (!category) return;

    const productRule = config?.grupos?.[categoryId] || {};
    const tipoSelecao =
      productRule.tipoSelecao || passo.tipoSelecao || category.tipoSelecao || 'multipla';
    const min = Number(productRule.min ?? passo.min ?? category.min ?? 0);
    let max = Number(productRule.max ?? passo.max ?? category.max ?? 99);
    if (tipoSelecao === 'simples') max = 1;

    let categoryItems = addonByCategory.get(categoryId) || [];
    if (Array.isArray(passo.itemIds) && passo.itemIds.length) {
      const allowed = new Set(passo.itemIds);
      categoryItems = categoryItems.filter((item) => allowed.has(item.id));
    }

    const exibirFotos = passo.exibirFotos !== false;
    const items = categoryItems.map((item) => ({
      id: item.id,
      name: item.nome,
      desc: item.descricao || '',
      extra: resolveAddonItemPrice(item, config, categoryId),
      imageUrl: exibirFotos ? item.imagemUrl || '' : '',
      exibirFotos,
    }));
    if (!items.length) return;

    const title = String(passo.titulo || category.nome || 'Adicionais').trim();
    const permitirRepetir =
      tipoSelecao === 'multipla' &&
      (productRule.permitirRepetir ?? passo.permitirRepetir) === true;
    const maxRepeticoes = permitirRepetir
      ? Math.min(
          Math.max(2, Math.floor(Number(productRule.maxRepeticoes ?? passo.maxRepeticoes) || 2)),
          Math.max(2, Math.max(1, max))
        )
      : 1;
    sections.push({
      section: title,
      stepTitle: title,
      required: (productRule.obrigatorio ?? passo.obrigatorio ?? category.obrigatorio) === true,
      min,
      max: Math.max(1, max),
      tipoSelecao,
      permitirRepetir,
      maxRepeticoes,
      exibirFotos,
      items,
    });
  });

  return sections;
}

export function buildAddonSections(parsed, selection, sectionTitlePrefix = '', config = null, passos = null) {
  if (Array.isArray(passos) && passos.length) {
    return buildAddonSectionsFromPassos(parsed, passos, config);
  }

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
