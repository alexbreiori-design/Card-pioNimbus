import { MARMITA_CATEGORY_NAME } from '@/lib/marmita/marmitaCardapio';
import { resolvePizzaCardapioFromStore } from '@/lib/pizza/pizzaCardapioResolve';
import { getActivePizzaCategorias, normalizePizzaCardapio } from '@/lib/pizza/pizzaModel';

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/**
 * Detecta nomes de seção já usados em outras partes do catálogo (produtos, marmitas, pizza).
 * Retorna lista de conflitos para exibir aviso no admin — não bloqueia o salvamento.
 */
export function findCategoryNameConflicts(
  nome,
  data,
  { excludeCategoryId = '', excludeGrupoId = '' } = {}
) {
  const normalized = normalizeName(nome);
  if (!normalized) return [];

  const conflicts = [];

  (data?.categorias || []).forEach((cat) => {
    if (excludeCategoryId && cat.id === excludeCategoryId) return;
    if (normalizeName(cat.nome) === normalized) {
      conflicts.push({ kind: 'produto', label: cat.nome });
    }
  });

  (data?.marmitaGrupos || []).forEach((grupo) => {
    if (excludeGrupoId && grupo.id === excludeGrupoId) return;
    if (normalizeName(grupo.nome) === normalized) {
      conflicts.push({ kind: 'marmita', label: grupo.nome });
    }
  });

  const pizzaCardapio = normalizePizzaCardapio(resolvePizzaCardapioFromStore(data || {}));
  getActivePizzaCategorias(pizzaCardapio).forEach((cat) => {
    if (normalizeName(cat.nomePublico) === normalized) {
      conflicts.push({ kind: 'pizza', label: cat.nomePublico });
    }
  });

  if (
    normalized === normalizeName(MARMITA_CATEGORY_NAME) &&
    !excludeGrupoId &&
    !(data?.marmitaGrupos || []).some((grupo) => normalizeName(grupo.nome) === normalized)
  ) {
    conflicts.push({
      kind: 'reservado',
      label: MARMITA_CATEGORY_NAME,
    });
  }

  const seen = new Set();
  return conflicts.filter((row) => {
    const token = `${row.kind}:${normalizeName(row.label)}`;
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  });
}

export function formatCategoryNameConflictMessage(conflicts) {
  if (!conflicts.length) return '';

  const parts = conflicts.map((row) => {
    if (row.kind === 'produto') return `categoria de produtos "${row.label}"`;
    if (row.kind === 'marmita') return `grupo de marmitas "${row.label}"`;
    if (row.kind === 'pizza') return `categoria de pizza "${row.label}"`;
    if (row.kind === 'reservado') {
      return `nome padrão do módulo de marmitas ("${row.label}")`;
    }
    return row.label;
  });

  return `Este nome coincide com ${parts.join(' e ')}. No cardápio, as seções ficam separadas, mas o nome igual pode confundir na navegação.`;
}
