import { buildAddonSections } from '@/lib/cardapio/addonSections';
import { normalizePecaTambemIds } from '@/lib/productSuggestions';
import {
  buildPrecoPorTamanhoSaborForCategoria,
  computeCategoriaFromPrice,
} from '@/lib/pizza/pizzaPricing';
import {
  buildPizzaProductId,
  PIZZA_VIRTUAL_CATEGORY_ID,
} from '@/lib/pizza/pizzaIds';
import { resolvePizzaCardapioFromStore } from '@/lib/pizza/pizzaCardapioResolve';
import {
  getActivePizzaCategorias,
  getCategoriaSabores,
  getCategoriaTamanhos,
  normalizePizzaCategoria,
} from '@/lib/pizza/pizzaModel';
import { resolveProductAddonPassos } from '@/lib/productAddonPassos';

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

  const showFlavorPhotos = categoria.exibirFotosSabores !== false;
  const flavorItems = sabores.map((sabor) => ({
    id: sabor.id,
    name: sabor.nome,
    desc: sabor.descricao || '',
    extra: 0,
    imageUrl: showFlavorPhotos ? sabor.imagemUrl || '' : '',
    exibirFotos: showFlavorPhotos,
  }));

  let addonPassos = resolveProductAddonPassos(categoria, {
    categories: parsed.adicionaisCategorias || [],
    items: parsed.adicionaisItens || [],
  });
  const hadStoredPassos =
    Array.isArray(rawCategoria?.adicionaisPassos) && rawCategoria.adicionaisPassos.length > 0;
  if (!hadStoredPassos && categoria.exibirFotosAdicionais === false) {
    addonPassos = addonPassos.map((passo) => ({ ...passo, exibirFotos: false }));
  }

  const addons = [
    {
      section: 'Sabores',
      required: true,
      min: categoria.minSabores,
      max: categoria.maxSabores,
      exibirFotos: showFlavorPhotos,
      items: flavorItems,
    },
    ...buildAddonSections(
      parsed,
      categoria.adicionais,
      '',
      categoria.adicionaisConfig,
      addonPassos
    ),
  ];

  const fromPrice = computeCategoriaFromPrice(cardapio, categoria);

  return {
    id: buildPizzaProductId(categoria.id),
    categoryId: PIZZA_VIRTUAL_CATEGORY_ID,
    category: categoria.nomePublico,
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
