import { buildCardapioCatalog } from '@/lib/cardapio/catalogFromStore';
import { expandAllMarmitasForAdmin } from '@/lib/marmita/buildMarmitaCatalog';
import { MARMITA_CATEGORY_NAME, MARMITA_VIRTUAL_CATEGORY_ID } from '@/lib/marmita/marmitaCardapio';
import { normalizeMarmita } from '@/lib/marmita/marmitaModel';
import { buildMarmitaProductId } from '@/lib/marmita/marmitaIds';
import { expandPizzasToProducts } from '@/lib/pizza/buildPizzaCatalog';
import { PIZZA_CATEGORY_NAME, PIZZA_VIRTUAL_CATEGORY_ID } from '@/lib/pizza/pizzaIds';
import { resolvePizzaCardapioFromStore } from '@/lib/pizza/pizzaCardapioResolve';
import {
  getActivePizzaSabores,
  getActivePizzaTamanhos,
  normalizePizzaCardapio,
} from '@/lib/pizza/pizzaModel';
function parseMoney(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(
    String(value || '')
      .replace(/\s/g, '')
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.')
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function buildPizzaPromoProductId(saborId, tamanhoId) {
  return `nimbus-pizza-promo-${saborId}-${tamanhoId}`;
}

function isRegularProduct(item) {
  return (
    item.ativo !== false &&
    item.tipo !== 'marmita' &&
    item.tipo !== 'tamanho_pizza' &&
    item.tipo !== 'pizza' &&
    !item.tags?.includes('pizza')
  );
}

function expandMarmitasForAdmin(parsed) {
  const products = [];
  (parsed.marmitas || [])
    .filter((item) => item.ativo !== false)
    .forEach((rawMarmita) => {
      const marmita = normalizeMarmita(rawMarmita);
      if (!marmita.nomePublico) return;

      marmita.tamanhos
        .filter((tam) => tam.ativo !== false)
        .forEach((tamanho) => {
          const price = Number(String(tamanho.preco ?? '').replace(',', '.')) || 0;
          products.push({
            id: buildMarmitaProductId(marmita.id, tamanho.id),
            nome: `${marmita.nomePublico} — ${tamanho.nome}`,
            descricao: marmita.descricao || '',
            preco: price,
            imagemUrl: marmita.imagemUrl || '',
            categoriaId: MARMITA_VIRTUAL_CATEGORY_ID,
            tipo: 'marmita',
          });
        });
    });

  return products;
}

function mapCatalogProductToAdminOrder(product) {
  return {
    id: product.id,
    nome: product.name,
    descricao: product.desc || '',
    preco: Number(product.price || 0),
    imagemUrl: product.imageUrl || '',
    categoriaId: product.categoryId,
    tipo: product.type || 'comum',
    medida: product.tamanhoSelecionado?.nome || '',
    catalogProduct: product,
  };
}

/** Catálogo completo para Novo Pedido (com wizard de pizza/marmita e adicionais). */
export function buildAdminOrderCatalogProducts(data) {
  const catalog = buildCardapioCatalog(data);
  const products = [...catalog.products];
  const existingIds = new Set(products.map((item) => item.id));

  expandAllMarmitasForAdmin(data).forEach((item) => {
    if (!existingIds.has(item.id)) {
      products.push(item);
      existingIds.add(item.id);
    }
  });

  return products.map(mapCatalogProductToAdminOrder);
}

/** Produtos disponíveis no modal de Novo Pedido (produtos + pizzas + marmitas). */
export function buildAdminOrderProducts(data) {
  const regular = (data.produtos || []).filter(isRegularProduct).map((item) => ({
    id: item.id,
    nome: item.nome,
    descricao: item.descricao || '',
    preco: Number(item.preco || 0),
    imagemUrl: item.imagemUrl || '',
    categoriaId: item.categoriaId,
    tipo: item.tipo || 'comum',
  }));

  const pizzas = expandPizzasToProducts(data).map((item) => ({
    id: item.id,
    nome: item.name,
    descricao: item.desc,
    preco: item.price,
    imagemUrl: item.imageUrl || '',
    categoriaId: item.categoryId || PIZZA_VIRTUAL_CATEGORY_ID,
    tipo: 'pizza',
  }));

  const marmitas = expandMarmitasForAdmin(data);

  return [...pizzas, ...regular, ...marmitas];
}

/** Categorias virtuais para filtro no Novo Pedido. */
export function buildAdminOrderCategories(data, products = []) {
  const cats = (data.categorias || []).filter((item) => item.ativo !== false);
  const extras = [];

  if (products.some((item) => item.categoriaId === PIZZA_VIRTUAL_CATEGORY_ID)) {
    extras.push({ id: PIZZA_VIRTUAL_CATEGORY_ID, nome: PIZZA_CATEGORY_NAME });
  }
  if (products.some((item) => item.categoriaId === MARMITA_VIRTUAL_CATEGORY_ID)) {
    extras.push({ id: MARMITA_VIRTUAL_CATEGORY_ID, nome: MARMITA_CATEGORY_NAME });
  }

  return [...extras, ...cats];
}

/** Sabores individuais de pizza para promoções. */
export function expandPizzaSaboresToPromoProducts(data) {
  const cardapio = normalizePizzaCardapio(resolvePizzaCardapioFromStore(data));
  const sabores = getActivePizzaSabores(cardapio);
  const tamanhos = getActivePizzaTamanhos(cardapio);
  const products = [];

  sabores.forEach((sabor) => {
    tamanhos.forEach((tamanho) => {
      if (!sabor.tamanhoIds?.includes(tamanho.id)) return;
      const price = parseMoney(sabor.precos?.[tamanho.id]);
      if (price <= 0) return;

      const tamLabel = tamanho.descricaoFatias
        ? `${tamanho.nome} (${tamanho.descricaoFatias})`
        : tamanho.nome;

      products.push({
        id: buildPizzaPromoProductId(sabor.id, tamanho.id),
        nome: `Pizza de ${sabor.nome}, ${tamLabel}`,
        descricao: sabor.descricao || '',
        preco: price,
        imagemUrl: sabor.imagemUrl || '',
        categoriaId: PIZZA_VIRTUAL_CATEGORY_ID,
        tipo: 'pizza_sabor_promo',
        saborId: sabor.id,
        tamanhoId: tamanho.id,
      });
    });
  });

  return products;
}

/** Produtos elegíveis para promoções (produtos + sabores de pizza). */
export function buildAdminPromoProducts(data) {
  const regular = (data.produtos || []).filter((item) => item.ativo !== false);
  const pizzaSabores = expandPizzaSaboresToPromoProducts(data);
  return [...regular, ...pizzaSabores];
}
