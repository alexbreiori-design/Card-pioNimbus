import { splitCartObsParts, stripCartOptStepSuffix } from '@/lib/cardapio/formatCartOpts';

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

/** Interpreta rótulos do carrinho como `2x Granola` (qty + nome). */
export function parseAddonOptQtyLabel(label = '') {
  const text = String(label || '').trim();
  if (!text) return { qty: 0, name: '' };
  const match = text.match(/^(\d+)\s*[x×]\s+(.+)$/i);
  if (match) {
    return {
      qty: Math.max(1, Math.floor(Number(match[1]) || 1)),
      name: String(match[2] || '').trim(),
    };
  }
  return { qty: 1, name: text };
}

export function addonExtraFromObs(obs, storeData, produto) {
  if (!obs || !String(obs).trim()) return 0;
  const config = produto?.adicionaisConfig || {};
  const labels = splitCartObsParts(obs).map((part) => stripCartOptStepSuffix(part));
  let sum = 0;

  for (const raw of labels) {
    const trimmed = String(raw || '').trim();
    if (!trimmed || trimmed.toLowerCase().startsWith('obs:')) continue;
    const { qty, name } = parseAddonOptQtyLabel(trimmed);
    if (!name || qty < 1) continue;
    const nameLower = name.toLowerCase();
    const item = (storeData.adicionaisItens || []).find(
      (entry) => entry.ativo !== false && String(entry.nome || '').trim().toLowerCase() === nameLower
    );
    if (!item) continue;
    sum += resolveAddonItemPrice(item, config, item.categoriaId) * qty;
  }

  return money(sum);
}
