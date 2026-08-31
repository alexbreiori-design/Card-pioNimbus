import { buildAddonSections, buildAddonSectionsFromPassos } from '@/lib/cardapio/addonSections';
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

function parseObsLabels(obs = '') {
  return splitCartObsParts(obs)
    .map((part) => stripCartOptStepSuffix(part))
    .map((part) => String(part || '').trim())
    .filter((part) => part && !part.toLowerCase().startsWith('obs:'));
}

function buildPricingSections(storeData, produto) {
  if (!produto || !storeData) return [];
  const config = produto.adicionaisConfig || {};
  const passos = produto.adicionaisPassos;
  if (Array.isArray(passos) && passos.length) {
    return buildAddonSectionsFromPassos(storeData, passos, config);
  }
  const selection = produto.adicionais;
  if (
    selection &&
    ((Array.isArray(selection.categoriaIds) && selection.categoriaIds.length) ||
      (Array.isArray(selection.itemIds) && selection.itemIds.length))
  ) {
    return buildAddonSections(storeData, selection, '', config, null);
  }
  return [];
}

function addonExtraFromObsGlobal(labels, storeData, produto) {
  const config = produto?.adicionaisConfig || {};
  let sum = 0;

  for (const raw of labels) {
    const { qty, name } = parseAddonOptQtyLabel(raw);
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

/**
 * Soma extras a partir das opções salvas no pedido.
 * Usa a ordem dos passos do produto para desambiguar nomes repetidos
 * (ex.: proteína inclusa vs adicional pago com o mesmo rótulo).
 */
export function addonExtraFromObs(obs, storeData, produto) {
  if (!obs || !String(obs).trim()) return 0;
  const config = produto?.adicionaisConfig || {};
  const labels = parseObsLabels(obs);
  if (!labels.length) return 0;

  const sections = buildPricingSections(storeData, produto);
  if (!sections.length) {
    return addonExtraFromObsGlobal(labels, storeData, produto);
  }

  const sectionCounts = sections.map(() => 0);
  let sum = 0;

  for (const raw of labels) {
    const { qty, name } = parseAddonOptQtyLabel(raw);
    if (!name || qty < 1) continue;
    const key = name.toLowerCase();
    let matched = false;

    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
      const section = sections[sectionIndex];
      const maxUnits = Math.max(1, Number(section.max || 1));
      if (sectionCounts[sectionIndex] + qty > maxUnits) continue;

      const sectionItem = (section.items || []).find(
        (entry) => String(entry.name || '').trim().toLowerCase() === key
      );
      if (!sectionItem) continue;

      const storeItem = (storeData.adicionaisItens || []).find(
        (entry) => entry.id === sectionItem.id && entry.ativo !== false
      );
      const categoriaId = storeItem?.categoriaId || '';
      const unitPrice = storeItem
        ? resolveAddonItemPrice(storeItem, config, categoriaId)
        : money(sectionItem.extra ?? 0);

      sum += unitPrice * qty;
      sectionCounts[sectionIndex] += qty;
      matched = true;
      break;
    }

    if (!matched) {
      sum += addonExtraFromObsGlobal([raw], storeData, produto);
    }
  }

  return money(sum);
}
