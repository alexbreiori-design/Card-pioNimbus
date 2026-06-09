import { resolveAddonItemPrice } from '@/lib/addonPricing';
import { normalizePecaTambemIds } from '@/lib/productSuggestions';
import {
  buildPrecoPorTamanhoSaborForCategoria,
  computeCategoriaFromPrice,
} from '@/lib/pizza/pizzaPricing';
import {
  buildPizzaProductId,
  PIZZA_CATEGORY_NAME,
  PIZZA_VIRTUAL_CATEGORY_ID,
} from '@/lib/pizza/pizzaIds';
import { resolvePizzaCardapioFromStore } from '@/lib/pizza/pizzaCardapioResolve';
import {
  getActivePizzaCategorias,
  getCategoriaSabores,
  getCategoriaTamanhos,
  normalizePizzaCategoria,
} from '@/lib/pizza/pizzaModel';

function normalizeSelection(selection) {
  return {
    categoriaIds: Array.isArray(selection?.categoriaIds) ? selection.categoriaIds : [],
    itemIds: Array.isArray(selection?.itemIds) ? selection.itemIds : [],
  };
}

function buildPizzaAddonSections(parsed, categoria) {
  const safe = normalizeSelection(categoria.adicionais);
  const config = categoria.adicionaisConfig || {};
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
    const productRule = config.grupos?.[categoryId] || {};
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
      section: category.nome,
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
      section: 'Complementos',
      required: false,
      min: 0,
      max: singles.length,
      items: singles,
    });
  }

  return sections;
}

function expandOneCategoriaToProduct(parsed, cardapio, rawCategoria) {
  const categoria = normalizePizzaCategoria(rawCategoria);
  if (categoria.ativo === false) return null;

  const tamanhos = getCategoriaTamanhos(cardapio, categoria);
  const sabores = getCategoriaSabores(cardapio, categoria);
  if (!tamanhos.length || !sabores.length) return null;

  const precoPorTamanhoSabor = buildPrecoPorTamanhoSaborForCategoria(cardapio, categoria);
  const hasPrice = Object.keys(precoPorTamanhoSabor).length > 0;
  if (!hasPrice) return null;

  const pizzaConfig = {
    pizzaId: categoria.id,
    categoriaId: categoria.id,
    minSabores: categoria.minSabores,
    maxSabores: categoria.maxSabores,
    tamanhoConfig: tamanhos.map((tamanho) => ({
      tamanhoId: tamanho.id,
      tamanhoNome: tamanho.descricaoFatias
        ? `${tamanho.nome} (${tamanho.descricaoFatias})`
        : tamanho.nome,
      tamanhoPreco: 0,
      maxSabores: categoria.maxSabores,
      ativo: true,
    })),
    saboresSelecionados: sabores.map((sabor) => sabor.id),
    precoPorTamanhoSabor,
    regraPreco: categoria.regraPreco,
    permitirSaboresDuplicados: categoria.permitirSaboresDuplicados,
    precoIntegralPorCelula: true,
  };

  const flavorItems = sabores.map((sabor) => ({
    id: sabor.id,
    name: sabor.nome,
    desc: sabor.descricao || '',
    extra: 0,
    imageUrl: sabor.imagemUrl || '',
  }));

  const addons = [
    {
      section: 'Sabores',
      required: true,
      min: categoria.minSabores,
      max: categoria.maxSabores,
      items: flavorItems,
    },
    ...buildPizzaAddonSections(parsed, categoria),
  ];

  const fromPrice = computeCategoriaFromPrice(cardapio, categoria);

  return {
    id: buildPizzaProductId(categoria.id),
    categoryId: PIZZA_VIRTUAL_CATEGORY_ID,
    category: PIZZA_CATEGORY_NAME,
    name: categoria.nomePublico,
    desc: categoria.descricao,
    price: fromPrice,
    priceLabel: fromPrice > 0 ? 'A partir de' : '',
    imageUrl: categoria.imagemUrl || '',
    addons,
    type: 'pizza',
    pizzaConfig,
    relatedProductIds: normalizePecaTambemIds(categoria.pecaTambemIds),
    itemOrdem: categoria.ordem ?? 0,
    entregaRetirada: categoria.entregaRetirada !== false,
    mesaBalcao: categoria.mesaBalcao !== false,
  };
}

export function expandPizzasToProducts(parsed) {
  const cardapio = resolvePizzaCardapioFromStore(parsed);
  return getActivePizzaCategorias(cardapio)
    .map((categoria) => expandOneCategoriaToProduct(parsed, cardapio, categoria))
    .filter(Boolean);
}

/** Compat: primeira pizza do cardápio. */
export function expandPizzaToProduct(parsed) {
  const products = expandPizzasToProducts(parsed);
  return products[0] || null;
}
