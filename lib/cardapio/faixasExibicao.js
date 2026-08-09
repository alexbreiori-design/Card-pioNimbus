import { CATEGORY_LAYOUT_DEFAULT, normalizeCategoryLayout } from '@/lib/cardapio/categoryLayouts';

function uid(prefix = 'faixa') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyFaixaExibicao(overrides = {}) {
  return normalizeFaixaExibicao({
    id: uid('faixa'),
    nome: '',
    layout: CATEGORY_LAYOUT_DEFAULT,
    membroIds: [],
    ordem: 0,
    ...overrides,
  });
}

export function normalizeFaixaExibicao(raw, index = 0) {
  const item = raw && typeof raw === 'object' ? raw : {};
  return {
    id: String(item.id || uid('faixa')),
    nome: String(item.nome || '').trim(),
    layout: normalizeCategoryLayout(item.layout),
    membroIds: Array.isArray(item.membroIds)
      ? [...new Set(item.membroIds.map((id) => String(id || '').trim()).filter(Boolean))]
      : [],
    ordem: Number.isFinite(Number(item.ordem)) ? Number(item.ordem) : index,
  };
}

export function normalizeFaixasExibicao(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((row, index) => normalizeFaixaExibicao(row, index))
    .filter((faixa) => faixa.membroIds.length >= 2 && faixa.nome)
    .sort((a, b) => a.ordem - b.ordem)
    .map((faixa, index) => ({ ...faixa, ordem: index }));
}

/**
 * Nome canônico da seção no cardápio — o mesmo para todos os membros da faixa.
 * Sem isso, o collapse remove a 2ª categoria da lista e os produtos dela ficam órfãos.
 */
export function resolveFaixaSectionName(faixa, { memberNamesById, fallbackName } = {}) {
  const named = String(faixa?.nome || '').trim();
  if (named) return named;

  const ids = Array.isArray(faixa?.membroIds) ? faixa.membroIds : [];
  for (const id of ids) {
    const fromMap = memberNamesById?.get(String(id));
    if (fromMap) return String(fromMap).trim();
  }

  const fallback = String(fallbackName || '').trim();
  return fallback || 'Seção';
}

/** Remove membros inválidos e dissolve faixas com < 2 membros. */
export function sanitizeFaixasExibicao(list, validMemberIds = []) {
  const valid = new Set((validMemberIds || []).map(String));
  return normalizeFaixasExibicao(
    (Array.isArray(list) ? list : []).map((faixa) => ({
      ...faixa,
      membroIds: (faixa.membroIds || []).filter((id) => valid.has(String(id))),
    }))
  );
}

export function findFaixaForMember(faixas, memberId) {
  const id = String(memberId || '');
  if (!id) return null;
  return (
    (faixas || []).find((faixa) =>
      (faixa.membroIds || []).some((rowId) => String(rowId) === id)
    ) || null
  );
}

export function memberIdsInFaixas(faixas) {
  const ids = new Set();
  (faixas || []).forEach((faixa) => {
    (faixa.membroIds || []).forEach((id) => ids.add(String(id)));
  });
  return ids;
}

/**
 * Constrói mapa membroId → faixa e lista de nomes de seção na ordem dos membros.
 * Usado no build do cardápio público.
 */
export function buildFaixaSectionMaps(faixas, orderedMembers = []) {
  const normalized = normalizeFaixasExibicao(faixas);
  const byMemberId = new Map();
  const faixaById = new Map();

  normalized.forEach((faixa) => {
    faixaById.set(faixa.id, faixa);
    faixa.membroIds.forEach((id) => byMemberId.set(String(id), faixa));
  });

  const sectionNames = [];
  const seenFaixaIds = new Set();
  const layoutBySectionName = {};
  const iconBySectionName = {};

  const memberNamesById = new Map(
    orderedMembers.map((member) => [String(member?.id || ''), member?.nome || ''])
  );

  orderedMembers.forEach((member) => {
    const memberId = String(member?.id || '');
    if (!memberId) return;
    const faixa = byMemberId.get(memberId);
    if (faixa) {
      if (seenFaixaIds.has(faixa.id)) return;
      seenFaixaIds.add(faixa.id);
      const nome = resolveFaixaSectionName(faixa, {
        memberNamesById,
        fallbackName: member.nome,
      });
      if (!nome) return;
      sectionNames.push(nome);
      layoutBySectionName[nome] = faixa.layout;
      if (member.icone) iconBySectionName[nome] = member.icone;
      return;
    }
    const nome = member.nome;
    if (nome) sectionNames.push(nome);
  });

  return {
    faixas: normalized,
    byMemberId,
    faixaById,
    sectionNames,
    layoutBySectionName,
    iconBySectionName,
  };
}

/**
 * Resolve o nome público da seção para um membro (categoria/grupo).
 * Se estiver em faixa, retorna o nome da faixa; senão o nome próprio.
 */
export function resolveSectionNameForMember(faixas, memberId, fallbackName, memberNamesById) {
  const faixa = findFaixaForMember(faixas, memberId);
  if (!faixa) return fallbackName;
  return resolveFaixaSectionName(faixa, { memberNamesById, fallbackName });
}

export function createFaixaFromMembers({ nome, layout, membroIds, existing = [] }) {
  const next = emptyFaixaExibicao({
    nome,
    layout,
    membroIds,
    ordem: (existing || []).length,
  });
  return normalizeFaixasExibicao([...(existing || []), next]);
}

export function updateFaixaExibicao(list, faixaId, patch) {
  return normalizeFaixasExibicao(
    (list || []).map((faixa) => (faixa.id === faixaId ? { ...faixa, ...patch, id: faixa.id } : faixa))
  );
}

export function removeFaixaExibicao(list, faixaId) {
  return normalizeFaixasExibicao((list || []).filter((faixa) => faixa.id !== faixaId));
}

export function removeMemberFromFaixas(list, memberId) {
  const id = String(memberId || '');
  return sanitizeFaixasExibicao(
    (list || []).map((faixa) => ({
      ...faixa,
      membroIds: (faixa.membroIds || []).filter((rowId) => rowId !== id),
    })),
    (list || []).flatMap((faixa) => faixa.membroIds || []).filter((rowId) => rowId !== id)
  );
}

export function reorderFaixaMembers(list, faixaId, membroIds) {
  return updateFaixaExibicao(list, faixaId, { membroIds });
}
