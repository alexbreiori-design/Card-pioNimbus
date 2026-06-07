export const MARMITA_CATEGORY_NAME = 'Marmitas';
export const MARMITA_VIRTUAL_CATEGORY_ID = '__marmita_virtual__';

export function defaultMarmitaCardapio() {
  return {
    vincularHorario: false,
    horarioInicio: '11:00',
    horarioFim: '14:00',
    continuarModo: 'nao',
    depoisCategoriaId: '',
  };
}

function migrateContinuarModo(cfg, posicao) {
  if (cfg.continuarModo === 'depois' || cfg.continuarModo === 'nao') {
    return cfg.continuarModo;
  }
  if (cfg.continuarDepoisHorario === false) return 'nao';
  if (posicao.tipo === 'apos' && posicao.categoriaId) return 'depois';
  return 'nao';
}

export function normalizeMarmitaCardapio(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {};
  const posicao = cfg.posicao && typeof cfg.posicao === 'object' ? cfg.posicao : {};
  const continuarModo = migrateContinuarModo(cfg, posicao);
  const depoisCategoriaId =
    String(cfg.depoisCategoriaId || '').trim() ||
    (posicao.tipo === 'apos' ? String(posicao.categoriaId || '').trim() : '');

  return {
    vincularHorario: cfg.vincularHorario === true,
    horarioInicio: normalizeTimeValue(cfg.horarioInicio, '11:00'),
    horarioFim: normalizeTimeValue(cfg.horarioFim, '14:00'),
    continuarModo: continuarModo === 'depois' ? 'depois' : 'nao',
    depoisCategoriaId: continuarModo === 'depois' ? depoisCategoriaId : '',
  };
}

function normalizeTimeValue(value, fallback) {
  const text = String(value || fallback).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseTimeMinutes(value) {
  const [hours, minutes] = normalizeTimeValue(value, '00:00').split(':').map(Number);
  return hours * 60 + minutes;
}

function isWithinWindow(now, inicio, fim) {
  const current = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeMinutes(inicio);
  const end = parseTimeMinutes(fim);
  if (start <= end) return current >= start && current < end;
  return current >= start || current < end;
}

/** Define visibilidade e posição da categoria Marmitas no cardápio público. */
export function resolveMarmitaCatalogPlacement(
  config,
  { now = new Date(), hasVisibleMarmitas = false } = {}
) {
  if (!hasVisibleMarmitas) {
    return { visible: false, pinToTop: false, insertAfterCategoryId: null, insertAtEnd: false };
  }

  const cfg = normalizeMarmitaCardapio(config);
  if (!cfg.vincularHorario) {
    return { visible: true, pinToTop: true, insertAfterCategoryId: null, insertAtEnd: false };
  }

  const inWindow = isWithinWindow(now, cfg.horarioInicio, cfg.horarioFim);
  if (inWindow) {
    return { visible: true, pinToTop: true, insertAfterCategoryId: null, insertAtEnd: false };
  }
  if (cfg.continuarModo !== 'depois' || !cfg.depoisCategoriaId) {
    return { visible: false, pinToTop: false, insertAfterCategoryId: null, insertAtEnd: false };
  }
  return {
    visible: true,
    pinToTop: false,
    insertAfterCategoryId: cfg.depoisCategoriaId,
    insertAtEnd: false,
  };
}

export function describeMarmitaCardapioForAdmin(config, categorias = []) {
  const cfg = normalizeMarmitaCardapio(config);
  const categoryName = categorias.find((cat) => cat.id === cfg.depoisCategoriaId)?.nome || '';

  if (!cfg.vincularHorario) {
    return {
      headline: 'Sempre visível no topo',
      detail: 'A seção Marmitas aparece no início do cardápio, após promoções.',
    };
  }

  const horario = `${cfg.horarioInicio} – ${cfg.horarioFim}`;
  if (cfg.continuarModo === 'depois' && categoryName) {
    return {
      headline: `Horário ${horario}`,
      detail: `No topo durante o horário · Depois de ${categoryName} fora do horário`,
    };
  }

  return {
    headline: `Horário ${horario}`,
    detail: 'No topo durante o horário · Oculta fora do horário',
  };
}

export function insertMarmitaCategoryNames(categoryNames, categorias, placement) {
  const without = categoryNames.filter((name) => name !== MARMITA_CATEGORY_NAME);
  if (!placement.visible) return without;

  if (placement.pinToTop) {
    return [MARMITA_CATEGORY_NAME, ...without];
  }
  if (placement.insertAtEnd) {
    return [...without, MARMITA_CATEGORY_NAME];
  }
  if (placement.insertAfterCategoryId) {
    const refName = categorias.find((cat) => cat.id === placement.insertAfterCategoryId)?.nome;
    const index = refName ? without.indexOf(refName) : -1;
    if (index >= 0) {
      const next = [...without];
      next.splice(index + 1, 0, MARMITA_CATEGORY_NAME);
      return next;
    }
  }
  return [...without, MARMITA_CATEGORY_NAME];
}

export function mergeMarmitaCategoryList(categoryNames, categorias, placement, hasPromos) {
  const promoFirst = hasPromos && categoryNames[0] === 'Promoções';
  const regular = categoryNames.filter((name) => name !== 'Promoções' && name !== MARMITA_CATEGORY_NAME);
  const withMarmita = insertMarmitaCategoryNames(regular, categorias, placement);
  return promoFirst ? ['Promoções', ...withMarmita] : withMarmita;
}
