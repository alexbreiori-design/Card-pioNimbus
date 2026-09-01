import {
  findFaixaForMember,
  resolveFaixaSectionName,
} from '@/lib/cardapio/faixasExibicao';
import { MARMITA_VIRTUAL_CATEGORY_ID } from '@/lib/marmita/marmitaCardapio';
import { PIZZA_VIRTUAL_CATEGORY_ID } from '@/lib/pizza/pizzaIds';
import { PROMO_CATEGORY_NAME } from '@/lib/promocoes';

export const MARMITA_UNGROUPED_SECTION_ID = '__ungrouped__';

/** Chave estável de seção — evita colisão entre categorias regulares e módulo marmita. */
export function buildProductSectionKey(product) {
  if (!product || typeof product !== 'object') return 'product:unknown';

  if (product.type === 'marmita') {
    return `marmita:${product.marmitaGrupoId || MARMITA_UNGROUPED_SECTION_ID}`;
  }

  if (product.categoryId === PIZZA_VIRTUAL_CATEGORY_ID || product.type === 'pizza') {
    const pizzaCatId =
      product.pizzaCategoriaId ||
      product.pizzaConfig?.categoriaId ||
      product.sourceMemberId ||
      'default';
    return `pizza:${pizzaCatId}`;
  }

  if (product.faixaId) {
    return `faixa:${product.faixaId}`;
  }

  return `product:${product.categoryId || 'unknown'}`;
}

export function resolveProductSectionKeyForMemberId(memberId, faixas, prefix = 'product') {
  const id = String(memberId || '').trim();
  if (!id) return `${prefix}:unknown`;
  const faixa = findFaixaForMember(faixas, id);
  if (faixa) return `faixa:${faixa.id}`;
  return `${prefix}:${id}`;
}

/**
 * Colapsa membros ordenados em seções (faixa ou membro individual).
 * Retorna chaves estáveis (`product:`, `pizza:`, `marmita:` ou `faixa:`).
 */
export function collapseMembersToSections(orderedMembers, faixas, prefix) {
  const memberNamesById = new Map(
    orderedMembers.map((member) => [String(member?.id || ''), member?.nome || ''])
  );
  const byMember = new Map();
  (faixas || []).forEach((faixa) => {
    (faixa.membroIds || []).forEach((id) => byMember.set(String(id), faixa));
  });

  const sections = [];
  const seenFaixas = new Set();

  orderedMembers.forEach((member) => {
    const memberId = String(member?.id || '');
    if (!memberId) return;
    const faixa = byMember.get(memberId);
    if (faixa) {
      if (seenFaixas.has(faixa.id)) return;
      seenFaixas.add(faixa.id);
      const label = resolveFaixaSectionName(faixa, {
        memberNamesById,
        fallbackName: member.nome,
      });
      if (!label) return;
      sections.push({
        key: `faixa:${faixa.id}`,
        label,
        layout: faixa.layout,
        icon: member.icone || null,
      });
      return;
    }
    if (member.nome) {
      sections.push({
        key: `${prefix}:${memberId}`,
        label: member.nome,
        layout: null,
        icon: member.icone || null,
      });
    }
  });

  return { sections, memberNamesById };
}

export function insertMarmitaSectionKeys(
  sectionKeys,
  categorias,
  placement,
  marmitaSectionKeys = [],
  faixasProdutos = []
) {
  const marmitaKeys = marmitaSectionKeys.filter(Boolean);
  const marmitaSet = new Set(marmitaKeys);
  const without = sectionKeys.filter((key) => !marmitaSet.has(key));
  if (!placement.visible || !marmitaKeys.length) return without;

  if (placement.pinToTop) {
    return [...marmitaKeys, ...without];
  }
  if (placement.insertAtEnd) {
    return [...without, ...marmitaKeys];
  }
  if (placement.insertAfterCategoryId) {
    const refKey = resolveProductSectionKeyForMemberId(
      placement.insertAfterCategoryId,
      faixasProdutos,
      'product'
    );
    const index = without.indexOf(refKey);
    if (index >= 0) {
      const next = [...without];
      next.splice(index + 1, 0, ...marmitaKeys);
      return next;
    }
  }
  return [...without, ...marmitaKeys];
}

export function mergeMarmitaSectionList(
  sectionKeys,
  categorias,
  placement,
  hasPromos,
  marmitaSectionKeys = [],
  faixasProdutos = []
) {
  const promoFirst = hasPromos && sectionKeys[0] === PROMO_CATEGORY_NAME;
  const marmitaSet = new Set(marmitaSectionKeys);
  const regular = sectionKeys.filter(
    (key) => key !== PROMO_CATEGORY_NAME && !marmitaSet.has(key)
  );
  const withMarmita = insertMarmitaSectionKeys(
    regular,
    categorias,
    placement,
    marmitaSectionKeys,
    faixasProdutos
  );
  return promoFirst ? [PROMO_CATEGORY_NAME, ...withMarmita] : withMarmita;
}

export function attachSectionKeys(products) {
  return (products || []).map((product) => ({
    ...product,
    sectionKey:
      product.category === PROMO_CATEGORY_NAME
        ? PROMO_CATEGORY_NAME
        : product.sectionKey || buildProductSectionKey(product),
  }));
}
