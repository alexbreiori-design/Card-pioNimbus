import { addonExtraFromObs, money, resolveAddonItemPrice } from '@/lib/addonPricing';
import { findCupomByCode, calculateCupomDiscount } from '@/lib/cupons';
import {
  marmitaVirtualProduct,
  maxAddonExtraForMarmita,
  resolveMarmitaProduct,
} from '@/lib/marmita/resolveMarmita';
import {
  isPizzaProductId,
  maxPizzaUnitPriceForStore,
  minPizzaUnitPriceForStore,
  resolvePizzaUnitPrice,
} from '@/lib/pizza/resolvePizza';
import {
  isPizzaPromoProductId,
  maxPizzaPromoAddonExtra,
  resolvePizzaPromoOrderUnitPrice,
  resolvePizzaPromoUnitPrice,
} from '@/lib/pizza/pizzaPromo';
import { resolveStoreOpenStatus } from '@/lib/storeHours';

const MONEY_EPS = 0.02;

function resolveProductBasePrice(produtoId, storeData) {
  const produto = (storeData.produtos || []).find((p) => p.id === produtoId);
  if (!produto || produto.ativo === false) {
    throw new Error(`Produto inválido: ${produtoId || 'sem id'}`);
  }

  const promo = (storeData.promocoes || []).find(
    (p) => p.ativo !== false && p.produtoId === produtoId
  );
  if (promo) {
    return money(promo.valorPromocional ?? produto.preco);
  }
  return money(produto.preco);
}

function maxAddonExtraForProduct(produto, storeData) {
  const selection = produto.adicionais || {};
  const config = produto.adicionaisConfig || {};
  const categoryIds = Array.isArray(selection.categoriaIds) ? selection.categoriaIds : [];
  const itemIds = Array.isArray(selection.itemIds) ? selection.itemIds : [];
  let total = 0;

  for (const catId of categoryIds) {
    const category = (storeData.adicionaisCategorias || []).find(
      (c) => c.id === catId && c.ativo !== false
    );
    if (!category) continue;

    const productRule = config.grupos?.[catId] || {};
    const maxSelect = Math.min(
      productRule.max ?? category.max ?? 99,
      (storeData.adicionaisItens || []).filter((i) => i.categoriaId === catId && i.ativo !== false)
        .length
    );

    const prices = (storeData.adicionaisItens || [])
      .filter((i) => i.categoriaId === catId && i.ativo !== false)
      .map((item) => resolveAddonItemPrice(item, config, catId))
      .sort((a, b) => b - a);

    total += prices.slice(0, Math.max(0, maxSelect)).reduce((sum, p) => sum + p, 0);
  }

  for (const itemId of itemIds) {
    const item = (storeData.adicionaisItens || []).find((i) => i.id === itemId && i.ativo !== false);
    if (!item) continue;
    total += resolveAddonItemPrice(item, config, item.categoriaId);
  }

  return money(total);
}

function isLegacyPizzaProduct(produto) {
  return produto?.tipo === 'pizza' || Boolean(produto?.pizzaConfig?.tamanhoConfig?.length);
}

function resolveExpectedUnitPrice(produto, storeData, item) {
  const base = resolveProductBasePrice(produto.id, storeData);
  const obsExtra = addonExtraFromObs(item?.obs, storeData, produto);
  return money(base + obsExtra);
}

function resolveAllowedUnitMax(produto, storeData, item) {
  const base = resolveProductBasePrice(produto.id, storeData);
  const obsExtra = addonExtraFromObs(item?.obs, storeData, produto);

  if (isLegacyPizzaProduct(produto)) {
    const structuralExtra = maxAddonExtraForProduct(produto, storeData);
    return money(base + Math.max(structuralExtra, obsExtra));
  }

  const structuralExtra = maxAddonExtraForProduct(produto, storeData);
  return money(base + Math.max(structuralExtra, obsExtra));
}

function resolveAllowedUnitMin(produto, storeData) {
  return resolveProductBasePrice(produto.id, storeData);
}

/**
 * Valida pedido público contra catálogo da loja. Retorna totais recalculados.
 */
export function validatePublicOrder({ order, storeData, zonas = [], empresa = null }) {
  if (!order || !storeData) {
    throw new Error('Pedido ou catálogo ausente.');
  }

  if (empresa?.aberta === false) {
    throw new Error('Loja fechada no momento.');
  }

  const { aberta } = resolveStoreOpenStatus(storeData.loja);
  if (!aberta) {
    throw new Error('Loja fechada no momento.');
  }

  const itens = Array.isArray(order.itens) ? order.itens : [];
  if (!itens.length) {
    throw new Error('Pedido sem itens.');
  }

  let subtotal = 0;
  for (const item of itens) {
    const qtd = Math.max(1, Math.min(99, Number(item.qtd) || 1));
    const produtoId = item.produtoId;
    if (!produtoId) throw new Error('Item sem produto.');

    const marmitaLine = resolveMarmitaProduct(storeData, produtoId);
    const pizzaPromoLine = isPizzaPromoProductId(produtoId);
    const pizzaLine = !pizzaPromoLine && isPizzaProductId(produtoId);
    const produto = pizzaLine ? null : (storeData.produtos || []).find((p) => p.id === produtoId);
    const clientUnit = money(item.precoUnit);
    const clientLine = money(item.subtotal);

    if (marmitaLine) {
      const { marmita, basePrice } = marmitaLine;
      const virtual = marmitaVirtualProduct(marmita);
      const obsExtra = addonExtraFromObs(item?.obs, storeData, virtual);
      const expectedUnit = money(basePrice + obsExtra);
      const maxUnit = money(basePrice + maxAddonExtraForMarmita(marmita, storeData));

      if (clientUnit + MONEY_EPS < basePrice) {
        throw new Error(`Preço inválido para ${item.nome || marmita.nomePublico}.`);
      }
      if (clientUnit > maxUnit + MONEY_EPS) {
        throw new Error(`Preço excede o permitido para ${item.nome || marmita.nomePublico}.`);
      }
      if (Math.abs(clientUnit - expectedUnit) > MONEY_EPS) {
        throw new Error(`Preço inválido para ${item.nome || marmita.nomePublico}.`);
      }
    } else if (pizzaPromoLine) {
      const promoBase = resolvePizzaPromoUnitPrice(storeData, produtoId);
      const maxAddons = maxPizzaPromoAddonExtra(storeData, produtoId);
      const expectedUnit = resolvePizzaPromoOrderUnitPrice(storeData, item);
      const itemName = item.nome || 'Pizza promocional';

      if (!promoBase) {
        throw new Error(`Produto inválido: ${produtoId}`);
      }
      if (clientUnit + MONEY_EPS < promoBase) {
        throw new Error(`Preço inválido para ${itemName}.`);
      }
      if (clientUnit > money(promoBase + maxAddons) + MONEY_EPS) {
        throw new Error(`Preço excede o permitido para ${itemName}.`);
      }
      if (Math.abs(clientUnit - expectedUnit) > MONEY_EPS) {
        throw new Error(`Preço inválido para ${itemName}.`);
      }
    } else if (pizzaLine) {
      const minUnit = minPizzaUnitPriceForStore(storeData, produtoId);
      const maxUnit = maxPizzaUnitPriceForStore(storeData, produtoId);
      const expectedUnit = resolvePizzaUnitPrice(storeData, item);
      const itemName = item.nome || 'Pizza';

      if (!minUnit || !maxUnit) {
        throw new Error(`Produto inválido: ${produtoId}`);
      }
      if (clientUnit + MONEY_EPS < minUnit) {
        throw new Error(`Preço inválido para ${itemName}.`);
      }
      if (clientUnit > maxUnit + MONEY_EPS) {
        throw new Error(`Preço excede o permitido para ${itemName}.`);
      }
      if (Math.abs(clientUnit - expectedUnit) > MONEY_EPS) {
        throw new Error(`Preço inválido para ${itemName}.`);
      }
    } else {
      if (!produto) throw new Error(`Produto não encontrado: ${produtoId}`);

      const minUnit = resolveAllowedUnitMin(produto, storeData);

      if (clientUnit + MONEY_EPS < minUnit) {
        throw new Error(`Preço inválido para ${item.nome || produto.nome}.`);
      }

      if (isLegacyPizzaProduct(produto)) {
        const maxUnit = resolveAllowedUnitMax(produto, storeData, item);
        if (clientUnit > maxUnit + MONEY_EPS) {
          throw new Error(`Preço excede o permitido para ${item.nome || produto.nome}.`);
        }
      } else {
        const expectedUnit = resolveExpectedUnitPrice(produto, storeData, item);
        if (Math.abs(clientUnit - expectedUnit) > MONEY_EPS) {
          throw new Error(`Preço inválido para ${item.nome || produto.nome}.`);
        }
      }
    }
    if (Math.abs(clientLine - money(clientUnit * qtd)) > MONEY_EPS) {
      throw new Error(`Subtotal inválido para ${item.nome || produto?.nome || 'item'}.`);
    }

    subtotal += clientLine;
  }
  subtotal = money(subtotal);

  const pedidoMinimo = money(storeData.loja?.pedidoMinimo || 0);
  if (pedidoMinimo > 0 && subtotal + MONEY_EPS < pedidoMinimo) {
    throw new Error(`Pedido mínimo de R$ ${pedidoMinimo.toFixed(2).replace('.', ',')}.`);
  }

  const tipo = order.tipo === 'delivery' ? 'delivery' : 'retirada';
  let frete = 0;
  if (tipo === 'delivery') {
    frete = money(order.frete);
    if (frete < 0) throw new Error('Taxa de entrega inválida.');
    const maxFrete = money(
      Math.max(0, ...(zonas || []).map((z) => Number(z.taxa_entrega) || 0))
    );
    if (maxFrete > 0 && frete > maxFrete + MONEY_EPS) {
      throw new Error('Taxa de entrega fora da faixa permitida.');
    }
    if (!order.endereco && !order.enderecoTexto) {
      throw new Error('Endereço obrigatório para entrega.');
    }
  } else {
    frete = 0;
  }

  let desconto = 0;
  const cupomCodigo = String(order.cupomCodigo || '').trim();
  if (cupomCodigo) {
    const cupom = findCupomByCode(storeData.cupons, cupomCodigo);
    if (!cupom) throw new Error('Cupom inválido ou inativo.');
    desconto = money(calculateCupomDiscount(cupom, subtotal));
  } else {
    desconto = money(order.desconto);
    if (desconto > subtotal + MONEY_EPS) {
      throw new Error('Desconto inválido.');
    }
  }

  const total = money(Math.max(0, subtotal + frete - desconto));
  const clientSubtotal = money(order.subtotal);
  const clientTotal = money(order.total);

  if (Math.abs(clientSubtotal - subtotal) > MONEY_EPS) {
    throw new Error('Subtotal do pedido não confere.');
  }
  if (Math.abs(clientTotal - total) > MONEY_EPS) {
    throw new Error('Total do pedido não confere.');
  }

  return {
    subtotal,
    frete,
    desconto,
    total,
    tipo,
    empresaId: empresa?.id || null,
  };
}
