export function money(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Preço de um adicional — espelha a lógica do cardápio (0 é preço válido). */
export function resolveAddonItemPrice(item, config, categoriaId) {
  if (!item) return 0;
  const rule = config?.grupos?.[categoriaId]?.itens?.[item.id];
  if (rule != null && rule.precoAdicional != null) {
    return money(rule.precoAdicional);
  }
  return money(item.preco ?? 0);
}

import { splitCartObsParts, stripCartOptStepSuffix } from '@/lib/cardapio/formatCartOpts';

export function addonExtraFromObs(obs, storeData, produto) {
  if (!obs || !String(obs).trim()) return 0;
  const config = produto.adicionaisConfig || {};
  const labels = splitCartObsParts(obs).map((part) => stripCartOptStepSuffix(part).toLowerCase());
  let sum = 0;

  for (const label of labels) {
    const item = (storeData.adicionaisItens || []).find(
      (i) => i.ativo !== false && String(i.nome || '').trim().toLowerCase() === label
    );
    if (!item) continue;
    sum += resolveAddonItemPrice(item, config, item.categoriaId);
  }

  return money(sum);
}
