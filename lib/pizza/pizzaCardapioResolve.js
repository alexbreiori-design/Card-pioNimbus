import {
  emptyPizzaCardapio,
  getCategoriaSabores,
  getCategoriaTamanhos,
  normalizePizza,
  normalizePizzaCardapio,
  normalizePizzaCategoria,
} from '@/lib/pizza/pizzaModel';
import { migrateLegacyPizzasIfNeeded, migratePizzasArrayToCardapio } from '@/lib/pizza/migrateLegacyPizza';

function isNewPizzaCardapioShape(raw) {
  if (!raw || typeof raw !== 'object') return false;
  if (Array.isArray(raw.categorias) && raw.categorias.length > 0) return true;
  if (Array.isArray(raw.sabores) && raw.sabores.length > 0) return true;
  if (Array.isArray(raw.tamanhos) && raw.tamanhos.length > 0 && Array.isArray(raw.sabores)) {
    const monolithicRoot = raw.nomePublico !== undefined || raw.regraPreco !== undefined;
    const monolithicTam = raw.tamanhos.some((tam) => tam.maxSabores !== undefined);
    return !monolithicRoot && !monolithicTam;
  }
  return false;
}

function isMonolithicPizzaCardapio(raw) {
  if (!raw || typeof raw !== 'object') return false;
  return (
    Array.isArray(raw.tamanhos) &&
    (Array.isArray(raw.sabores) || raw.nomePublico !== undefined || raw.regraPreco !== undefined)
  );
}

/** Resolve e normaliza pizzaCardapio a partir do JSON da loja (com migração automática). */
export function resolvePizzaCardapioFromStore(data) {
  const raw = data || {};

  if (Array.isArray(raw.pizzas) && raw.pizzas.length) {
    return migratePizzasArrayToCardapio(raw.pizzas);
  }

  if (isNewPizzaCardapioShape(raw.pizzaCardapio)) {
    return normalizePizzaCardapio(raw.pizzaCardapio);
  }

  if (isMonolithicPizzaCardapio(raw.pizzaCardapio)) {
    return migratePizzasArrayToCardapio([raw.pizzaCardapio]);
  }

  const legacyPizzas = migrateLegacyPizzasIfNeeded(raw);
  if (legacyPizzas.length) {
    return migratePizzasArrayToCardapio(legacyPizzas);
  }

  return emptyPizzaCardapio();
}

/** @deprecated — compat com código que ainda usa pizzas[] monolíticas */
export function resolvePizzasFromStore(data) {
  const cardapio = resolvePizzaCardapioFromStore(data);
  return cardapio.categorias.map((categoria) => {
    const normalizedCat = normalizePizzaCategoria(categoria);
    const tamanhos = getCategoriaTamanhos(cardapio, normalizedCat).map((tam) => ({
      ...tam,
      maxSabores: normalizedCat.maxSabores,
    }));
    return normalizePizza({
      id: normalizedCat.id,
      nomePublico: normalizedCat.nomePublico,
      descricao: normalizedCat.descricao,
      imagemUrl: normalizedCat.imagemUrl,
      ativo: normalizedCat.ativo,
      ordem: normalizedCat.ordem,
      tamanhos,
      sabores: getCategoriaSabores(cardapio, normalizedCat),
      adicionais: normalizedCat.adicionais,
      adicionaisConfig: normalizedCat.adicionaisConfig,
      regraPreco: normalizedCat.regraPreco,
      permitirSaboresDuplicados: normalizedCat.permitirSaboresDuplicados,
      pecaTambemIds: normalizedCat.pecaTambemIds,
      entregaRetirada: normalizedCat.entregaRetirada,
      mesaBalcao: normalizedCat.mesaBalcao,
    });
  });
}
