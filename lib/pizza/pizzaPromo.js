import { money } from '@/lib/addonPricing';
import { expandPizzasToProducts } from '@/lib/pizza/buildPizzaCatalog';
import { resolvePizzaCardapioFromStore } from '@/lib/pizza/pizzaCardapioResolve';
import {
  getActivePizzaSabores,
  getActivePizzaTamanhos,
  normalizePizzaCardapio,
} from '@/lib/pizza/pizzaModel';
import { computePizzaAddonsFromObs } from '@/lib/pizza/resolvePizza';

function pizzaAddonSections(pizzaProduct) {
  return (pizzaProduct?.addons || []).filter((section) => section.section !== 'Sabores');
}

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

export function isPizzaPromoProductId(productId) {
  return String(productId || '').trim().startsWith('nimbus-pizza-promo-');
}

export function listPizzaPromoSkus(storeData) {
  const cardapio = normalizePizzaCardapio(resolvePizzaCardapioFromStore(storeData));
  const sabores = getActivePizzaSabores(cardapio);
  const tamanhos = getActivePizzaTamanhos(cardapio);
  const skus = [];

  sabores.forEach((sabor) => {
    tamanhos.forEach((tamanho) => {
      if (!sabor.tamanhoIds?.includes(tamanho.id)) return;
      const price = parseMoney(sabor.precos?.[tamanho.id]);
      if (price <= 0) return;
      skus.push({
        id: buildPizzaPromoProductId(sabor.id, tamanho.id),
        saborId: sabor.id,
        tamanhoId: tamanho.id,
      });
    });
  });

  return skus;
}

export function findPizzaPromoSku(storeData, productId) {
  return listPizzaPromoSkus(storeData).find((sku) => sku.id === productId) || null;
}

export function findBasePizzaProductForPromo(storeData, saborId) {
  const products = expandPizzasToProducts(storeData);
  return (
    products.find((product) => (product.pizzaConfig?.saboresSelecionados || []).includes(saborId)) ||
    null
  );
}

export function resolvePizzaPromoUnitPrice(storeData, productId) {
  const promo = (storeData.promocoes || []).find(
    (entry) => entry.ativo !== false && entry.produtoId === productId
  );
  if (promo) return money(promo.valorPromocional);

  const sku = findPizzaPromoSku(storeData, productId);
  if (!sku) return 0;

  const cardapio = normalizePizzaCardapio(resolvePizzaCardapioFromStore(storeData));
  const sabor = getActivePizzaSabores(cardapio).find((entry) => entry.id === sku.saborId);
  return money(parseMoney(sabor?.precos?.[sku.tamanhoId]));
}

export function maxPizzaPromoAddonExtra(storeData, productId) {
  const sku = findPizzaPromoSku(storeData, productId);
  if (!sku) return 0;
  const basePizza = findBasePizzaProductForPromo(storeData, sku.saborId);
  if (!basePizza) return 0;

  return pizzaAddonSections(basePizza)
    .flatMap((section) => section.items || [])
    .reduce((sum, item) => sum + Number(item.extra || 0), 0);
}

export function resolvePizzaPromoOrderUnitPrice(storeData, item) {
  const productId = item?.produtoId;
  const sku = findPizzaPromoSku(storeData, productId);
  if (!sku) throw new Error('Promoção de pizza indisponível.');

  const basePizza = findBasePizzaProductForPromo(storeData, sku.saborId);
  if (!basePizza) throw new Error('Pizza da promoção indisponível.');

  const promoBase = resolvePizzaPromoUnitPrice(storeData, productId);
  const addons = computePizzaAddonsFromObs(item?.obs, basePizza);
  return money(promoBase + addons);
}
