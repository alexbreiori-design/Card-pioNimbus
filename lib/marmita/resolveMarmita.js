import { money, resolveAddonItemPrice } from '@/lib/addonPricing';
import { parseMarmitaProductId } from '@/lib/marmita/marmitaIds';
import { normalizeMarmita } from '@/lib/marmita/marmitaModel';

export function findMarmita(storeData, marmitaId) {
  const safeId = String(marmitaId || '').trim();
  if (!safeId) return null;
  const raw = (storeData?.marmitas || []).find((item) => item.id === safeId && item.ativo !== false);
  return raw ? normalizeMarmita(raw) : null;
}

export function resolveMarmitaProduct(storeData, productId) {
  const parsed = parseMarmitaProductId(productId);
  if (!parsed) return null;

  const marmita = findMarmita(storeData, parsed.marmitaId);
  if (!marmita) return null;

  const tamanho = marmita.tamanhos.find(
    (item) => item.id === parsed.tamanhoId && item.ativo !== false
  );
  if (!tamanho) return null;

  return {
    marmita,
    tamanho,
    basePrice: money(Number(String(tamanho.preco ?? '').replace(',', '.')) || 0),
  };
}

/** Produto virtual para reutilizar validação de adicionais no pedido. */
export function marmitaVirtualProduct(marmita) {
  return {
    adicionais: {
      categoriaIds: (marmita.passos || []).map((p) => p.categoriaAdicionalId).filter(Boolean),
      itemIds: [],
    },
    adicionaisConfig: { grupos: marmita.passosConfig?.grupos || {} },
  };
}

export function maxAddonExtraForMarmita(marmita, storeData) {
  const virtual = marmitaVirtualProduct(marmita);
  const config = virtual.adicionaisConfig || {};
  let total = 0;

  for (const passo of marmita.passos || []) {
    const catId = passo.categoriaAdicionalId;
    if (!catId) continue;

    const category = (storeData.adicionaisCategorias || []).find(
      (c) => c.id === catId && c.ativo !== false
    );
    if (!category) continue;

    const productRule = config.grupos?.[catId] || {};
    const maxSelect = Math.min(
      productRule.max ?? passo.max ?? category.max ?? 99,
      (storeData.adicionaisItens || []).filter((i) => i.categoriaId === catId && i.ativo !== false)
        .length
    );

    const prices = (storeData.adicionaisItens || [])
      .filter((i) => i.categoriaId === catId && i.ativo !== false)
      .map((item) => resolveAddonItemPrice(item, config, catId))
      .sort((a, b) => b - a);

    total += prices.slice(0, Math.max(0, maxSelect)).reduce((sum, p) => sum + p, 0);
  }

  return money(total);
}
