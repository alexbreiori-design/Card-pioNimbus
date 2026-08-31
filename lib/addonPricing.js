import { buildAddonSections, buildAddonSectionsFromPassos } from '@/lib/cardapio/addonSections';
import { splitCartObsParts, splitCartOptStep } from '@/lib/cardapio/formatCartOpts';

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

function normalizeStepKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/:+\s*$/, '');
}

function parseObsLabels(obs = '') {
  return splitCartObsParts(obs)
    .map((part) => String(part || '').trim())
    .filter((part) => part && !part.toLowerCase().startsWith('obs:'))
    .map((part) => {
      const { core, step } = splitCartOptStep(part);
      const { qty, name } = parseAddonOptQtyLabel(core);
      return { qty, name, step };
    })
    .filter((entry) => entry.name && entry.qty >= 1);
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

function listNameCandidates(sections, sectionCounts, name, qty) {
  const key = String(name || '')
    .trim()
    .toLowerCase();
  const candidates = [];
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];
    const maxUnits = Math.max(1, Number(section.max || 1));
    if (sectionCounts[sectionIndex] + qty > maxUnits) continue;
    const sectionItem = (section.items || []).find(
      (entry) => String(entry.name || '').trim().toLowerCase() === key
    );
    if (!sectionItem) continue;
    candidates.push({
      sectionIndex,
      sectionItem,
      stepKey: normalizeStepKey(section.stepTitle || section.section),
    });
  }
  return candidates;
}

function pickCandidate(candidates, step = '') {
  if (!candidates.length) return null;
  const stepKey = normalizeStepKey(step);
  if (stepKey) {
    const byStep = candidates.find((entry) => entry.stepKey === stepKey);
    if (byStep) return byStep;
  }
  if (candidates.length === 1) return candidates[0];
  // Legado sem passo: nomes duplicados — não assumir o primeiro (costuma ser o grátis).
  // Prefere passo tipicamente pago ("adicional") quando existir; senão o último candidato.
  const paidLike = [...candidates]
    .reverse()
    .find((entry) => /(adicional|extra|pago)/i.test(entry.stepKey || ''));
  return paidLike || candidates[candidates.length - 1];
}

function priceFromCandidate(candidate, storeData, config) {
  const storeItem = (storeData.adicionaisItens || []).find(
    (entry) => entry.id === candidate.sectionItem.id && entry.ativo !== false
  );
  const categoriaId = storeItem?.categoriaId || '';
  if (storeItem) return resolveAddonItemPrice(storeItem, config, categoriaId);
  return money(candidate.sectionItem.extra ?? 0);
}

function addonExtraFromObsGlobal(entries, storeData, produto) {
  const config = produto?.adicionaisConfig || {};
  let sum = 0;

  for (const entry of entries) {
    const nameLower = String(entry.name || '')
      .trim()
      .toLowerCase();
    if (!nameLower || entry.qty < 1) continue;

    // Com passo, tenta achar item da categoria do passo via seções do produto.
    const sections = buildPricingSections(storeData, produto);
    if (sections.length) {
      const candidates = listNameCandidates(
        sections,
        sections.map(() => 0),
        entry.name,
        entry.qty
      );
      const picked = pickCandidate(candidates, entry.step);
      if (picked) {
        sum += priceFromCandidate(picked, storeData, config) * entry.qty;
        continue;
      }
    }

    const matches = (storeData.adicionaisItens || []).filter(
      (item) => item.ativo !== false && String(item.nome || '').trim().toLowerCase() === nameLower
    );
    if (!matches.length) continue;
    if (matches.length === 1) {
      sum += resolveAddonItemPrice(matches[0], config, matches[0].categoriaId) * entry.qty;
      continue;
    }
    // Vários itens com o mesmo nome no catálogo: prefere o de maior preço (pago).
    const priced = matches
      .map((item) => ({
        item,
        price: resolveAddonItemPrice(item, config, item.categoriaId),
      }))
      .sort((a, b) => b.price - a.price);
    sum += priced[0].price * entry.qty;
  }

  return money(sum);
}

/**
 * Soma extras pelos IDs dos adicionais (fonte de verdade).
 * Retorna `null` se o campo não veio no pedido (legado → usar obs).
 */
export function addonExtraFromSelections(selections, storeData, produto) {
  if (selections == null) return null;
  if (!Array.isArray(selections)) return null;

  const config = produto?.adicionaisConfig || {};
  let sum = 0;

  for (const raw of selections) {
    const id = String(raw?.id || raw?.itemId || '').trim();
    const qty = Math.max(1, Math.floor(Number(raw?.qty ?? raw?.quantidade ?? 1) || 1));
    if (!id || qty < 1) continue;
    const item = (storeData.adicionaisItens || []).find(
      (entry) => entry.id === id && entry.ativo !== false
    );
    if (!item) continue;
    sum += resolveAddonItemPrice(item, config, item.categoriaId) * qty;
  }

  return money(sum);
}

/** Prefere IDs do pedido; cai para obs só em pedidos legados. */
export function resolveOrderItemAddonExtra(item, storeData, produto) {
  const fromIds = addonExtraFromSelections(
    item?.adicionais ?? item?.addonSelections ?? item?.addonsSelecionados,
    storeData,
    produto
  );
  if (fromIds != null) return fromIds;
  return addonExtraFromObs(item?.obs, storeData, produto);
}

/**
 * Soma extras a partir das opções salvas no pedido.
 * Usa o passo gravado em "Nome (Passo)" e a ordem das seções para
 * desambiguar nomes repetidos (proteína inclusa vs adicional pago).
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

  for (const entry of labels) {
    const candidates = listNameCandidates(sections, sectionCounts, entry.name, entry.qty);
    const picked = pickCandidate(candidates, entry.step);
    if (!picked) {
      sum += addonExtraFromObsGlobal([entry], storeData, produto);
      continue;
    }
    sum += priceFromCandidate(picked, storeData, config) * entry.qty;
    sectionCounts[picked.sectionIndex] += entry.qty;
  }

  return money(sum);
}
