import {
  getCategoriaSabores,
  getCategoriaTamanhos,
  normalizePizzaCardapio,
  normalizePizzaCategoria,
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

export function getPizzaCellPrice(pizzaConfig, saborId, tamanhoId, fallback = 0) {
  const key = `${saborId}:${tamanhoId}`;
  const raw = pizzaConfig?.precoPorTamanhoSabor?.[key];
  const parsed = parseMoney(raw);
  return parsed > 0 ? parsed : parseMoney(fallback);
}

export function buildPrecoPorTamanhoSaborForCategoria(cardapio, categoria) {
  const normalized = normalizePizzaCardapio(cardapio);
  const cat = normalizePizzaCategoria(categoria);
  const sabores = getCategoriaSabores(normalized, cat);
  const tamanhos = getCategoriaTamanhos(normalized, cat);
  const map = {};

  sabores.forEach((sabor) => {
    tamanhos.forEach((tamanho) => {
      if (!sabor.tamanhoIds?.includes(tamanho.id)) return;
      const price = parseMoney(sabor.precos?.[tamanho.id]);
      if (price > 0) {
        map[`${sabor.id}:${tamanho.id}`] = price;
      }
    });
  });

  return map;
}

/** @deprecated — compat monolítico */
export function buildPrecoPorTamanhoSabor(pizza) {
  const sabores = Array.isArray(pizza?.sabores) ? pizza.sabores : [];
  const tamanhos = Array.isArray(pizza?.tamanhos) ? pizza.tamanhos : [];
  const map = {};
  sabores.forEach((sabor) => {
    tamanhos.forEach((tamanho) => {
      const price = parseMoney(sabor.precos?.[tamanho.id]);
      if (price > 0) {
        map[`${sabor.id}:${tamanho.id}`] = price;
      }
    });
  });
  return map;
}

export function computePizzaFlavorUnitPrice(pizzaConfig, tamanhoId, flavorIds = []) {
  if (!flavorIds.length) return 0;
  const prices = flavorIds.map((flavorId) => getPizzaCellPrice(pizzaConfig, flavorId, tamanhoId));
  const valid = prices.filter((value) => value > 0);
  if (!valid.length) return 0;
  if (flavorIds.length === 1) return valid[0];
  if (pizzaConfig?.regraPreco === 'media') {
    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
  }
  return Math.max(...valid);
}

export function computeCategoriaFromPrice(cardapio, categoria) {
  const config = {
    precoPorTamanhoSabor: buildPrecoPorTamanhoSaborForCategoria(cardapio, categoria),
    regraPreco: normalizePizzaCategoria(categoria).regraPreco,
  };
  const sabores = getCategoriaSabores(cardapio, categoria);
  const tamanhos = getCategoriaTamanhos(cardapio, categoria);
  if (!tamanhos.length || !sabores.length) return 0;

  const candidates = [];
  tamanhos.forEach((tamanho) => {
    sabores.forEach((sabor) => {
      if (!sabor.tamanhoIds?.includes(tamanho.id)) return;
      const price = getPizzaCellPrice(config, sabor.id, tamanho.id, sabor.precos?.[tamanho.id]);
      if (price > 0) candidates.push(price);
    });
  });

  return candidates.length ? Math.min(...candidates) : 0;
}

/** @deprecated */
export function computePizzaFromPrice(pizza) {
  const config = {
    precoPorTamanhoSabor: buildPrecoPorTamanhoSabor(pizza),
    regraPreco: pizza?.regraPreco,
  };
  const tamanhos = Array.isArray(pizza?.tamanhos) ? pizza.tamanhos.filter((item) => item.ativo !== false) : [];
  const sabores = Array.isArray(pizza?.sabores)
    ? pizza.sabores.filter((item) => item.ativo !== false && String(item.nome || '').trim())
    : [];
  if (!tamanhos.length || !sabores.length) return 0;

  const candidates = [];
  tamanhos.forEach((tamanho) => {
    sabores.forEach((sabor) => {
      const price = getPizzaCellPrice(config, sabor.id, tamanho.id, sabor.precos?.[tamanho.id]);
      if (price > 0) candidates.push(price);
    });
  });

  return candidates.length ? Math.min(...candidates) : 0;
}

export function computePizzaMaxUnitPrice(pizzaConfig, addonCap = 0) {
  const sizes = pizzaConfig?.tamanhoConfig || [];
  const sabores = pizzaConfig?.saboresSelecionados || [];
  if (!sizes.length || !sabores.length) return 0;

  let maxUnit = 0;
  sizes.forEach((sizeCfg) => {
    if (sizeCfg.ativo === false) return;
    const singleMax = computePizzaFlavorUnitPrice(pizzaConfig, sizeCfg.tamanhoId, sabores);
    maxUnit = Math.max(maxUnit, singleMax + addonCap);
  });
  return maxUnit;
}

export function computePizzaMinUnitPrice(pizzaConfig) {
  const sizes = pizzaConfig?.tamanhoConfig || [];
  const sabores = pizzaConfig?.saboresSelecionados || [];
  if (!sizes.length || !sabores.length) return 0;

  const candidates = [];
  sizes.forEach((sizeCfg) => {
    if (sizeCfg.ativo === false) return;
    sabores.forEach((saborId) => {
      const price = getPizzaCellPrice(pizzaConfig, saborId, sizeCfg.tamanhoId);
      if (price > 0) candidates.push(price);
    });
  });
  return candidates.length ? Math.min(...candidates) : 0;
}
