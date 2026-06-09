import { money } from '@/lib/addonPricing';
import { expandPizzasToProducts } from '@/lib/pizza/buildPizzaCatalog';
import { isPizzaProductId, parsePizzaProductId } from '@/lib/pizza/pizzaIds';
import {
  computePizzaFlavorUnitPrice,
  computePizzaMaxUnitPrice,
  computePizzaMinUnitPrice,
} from '@/lib/pizza/pizzaPricing';

export function findPizzaProducts(storeData) {
  return expandPizzasToProducts(storeData);
}

export function findPizzaProductById(storeData, productId) {
  const pizzaId = parsePizzaProductId(productId);
  if (!pizzaId) return null;
  const products = findPizzaProducts(storeData);
  if (productId === 'nimbus-pizza-monte-sua') {
    return products[0] || null;
  }
  return (
    products.find(
      (product) =>
        product.pizzaConfig?.pizzaId === pizzaId ||
        product.id === productId ||
        product.id === `nimbus-pizza-${pizzaId}`
    ) || null
  );
}

export { isPizzaProductId };

function pizzaFlavorPool(pizzaProduct) {
  const config = pizzaProduct?.pizzaConfig || {};
  return (pizzaProduct?.addons || [])
    .flatMap((section) => section.items || [])
    .filter((item) => (config.saboresSelecionados || []).includes(item.id))
    .filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index);
}

function addonSections(pizzaProduct) {
  return (pizzaProduct?.addons || []).filter((section) => section.section !== 'Sabores');
}

export function parsePizzaObs(obs, pizzaProduct) {
  const parts = String(obs || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const config = pizzaProduct?.pizzaConfig || {};
  const sizeOptions = config.tamanhoConfig || [];
  const flavorPool = pizzaFlavorPool(pizzaProduct);
  const addonItems = addonSections(pizzaProduct).flatMap((section) => section.items || []);

  let tamanhoId = '';
  const flavorIds = [];
  const addonNames = [];

  for (const part of parts) {
    if (/^tamanho:/i.test(part)) {
      const label = part.replace(/^tamanho:\s*/i, '').trim();
      const match = sizeOptions.find(
        (size) =>
          size.tamanhoNome === label ||
          String(size.tamanhoId) === label ||
          label.startsWith(size.tamanhoNome || '')
      );
      if (match) tamanhoId = match.tamanhoId;
      continue;
    }

    const flavor = flavorPool.find((item) => item.name.toLowerCase() === part.toLowerCase());
    if (flavor) {
      flavorIds.push(flavor.id);
      continue;
    }

    const addon = addonItems.find((item) => item.name.toLowerCase() === part.toLowerCase());
    if (addon) addonNames.push(addon.name);
  }

  return { tamanhoId, flavorIds, addonNames };
}

export function computePizzaAddonsFromObs(obs, pizzaProduct) {
  const addonItems = addonSections(pizzaProduct).flatMap((section) => section.items || []);
  const parts = String(obs || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  let sum = 0;
  for (const part of parts) {
    const addon = addonItems.find((item) => item.name.toLowerCase() === part);
    if (addon) sum += Number(addon.extra || 0);
  }
  return money(sum);
}

export function resolvePizzaUnitPrice(storeData, item) {
  const pizzaProduct = findPizzaProductById(storeData, item?.produtoId);
  if (!pizzaProduct) throw new Error('Pizza não disponível');

  const parsed = parsePizzaObs(item?.obs, pizzaProduct);
  const flavorPrice = computePizzaFlavorUnitPrice(
    pizzaProduct.pizzaConfig,
    parsed.tamanhoId,
    parsed.flavorIds
  );
  const addons = computePizzaAddonsFromObs(item?.obs, pizzaProduct);
  return money(flavorPrice + addons);
}

export function maxPizzaUnitPriceForStore(storeData, productId) {
  const pizzaProduct = findPizzaProductById(storeData, productId);
  if (!pizzaProduct) return 0;

  const maxAddons = addonSections(pizzaProduct)
    .flatMap((section) => section.items || [])
    .reduce((sum, item) => sum + Number(item.extra || 0), 0);
  return computePizzaMaxUnitPrice(pizzaProduct.pizzaConfig, maxAddons);
}

export function minPizzaUnitPriceForStore(storeData, productId) {
  const pizzaProduct = findPizzaProductById(storeData, productId);
  if (!pizzaProduct) return 0;
  return computePizzaMinUnitPrice(pizzaProduct.pizzaConfig);
}
