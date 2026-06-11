import { getCurrentWeekdayKey, DEFAULT_STORE_TIMEZONE } from '@/lib/storeHours';
import {
  getMarmitaWeekdayLabel,
  marmitaDaysOverlap,
  normalizeMarmitaDiaSemana,
} from '@/lib/marmita/marmitaWeekdays';
import { normalizeMarmita } from '@/lib/marmita/marmitaModel';
import { buildMarmitaAddonSections } from '@/lib/marmita/buildMarmitaCatalog';

export function getMarmitaDateKey(date = new Date(), timeZone = DEFAULT_STORE_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getMarmitaGrupoConflictScope(grupoId) {
  return String(grupoId || '').trim();
}

export function grupoPermiteDiasDuplicados(grupoId, marmitaGrupos = []) {
  const scope = getMarmitaGrupoConflictScope(grupoId);
  if (!scope) return false;
  const grupo = (marmitaGrupos || []).find((row) => row.id === scope);
  return grupo?.permitirDiasDuplicados === true;
}

export function findActiveMarmitaDayConflict(
  marmitas,
  { marmitaId, diaSemana, ativo, grupoId, marmitaGrupos }
) {
  if (ativo === false || !diaSemana) return null;

  const normalizedDay = normalizeMarmitaDiaSemana(diaSemana);
  if (!normalizedDay) return null;

  if (grupoPermiteDiasDuplicados(grupoId, marmitaGrupos)) return null;

  const scope = getMarmitaGrupoConflictScope(grupoId);
  const activeInScope = (marmitas || []).filter(
    (row) =>
      row.id !== marmitaId &&
      row.ativo !== false &&
      getMarmitaGrupoConflictScope(row.grupoId) === scope
  );

  return (
    activeInScope.find((row) => marmitaDaysOverlap(row.diaSemana, normalizedDay)) || null
  );
}

export function formatMarmitaDayConflictMessage(conflict, diaSemanaBeingActivated) {
  if (!conflict) return '';
  const tag = conflict.tagAdmin || conflict.nomePublico || 'Outra marmita';
  const conflictDayLabel = getMarmitaWeekdayLabel(
    diaSemanaBeingActivated || conflict.diaSemana
  );
  return `Este grupo não permite mais de uma marmita no mesmo dia. Já existe "${tag}" (${conflictDayLabel}) ativa.`;
}

export function enforceSingleActiveMarmitaPerGrupo(marmitas, grupoId) {
  const scope = getMarmitaGrupoConflictScope(grupoId);
  if (!scope) return marmitas;

  const inGrupo = [...(marmitas || [])]
    .filter((row) => getMarmitaGrupoConflictScope(row.grupoId) === scope)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  if (!inGrupo.length) return marmitas;

  const keepId = inGrupo[0].id;
  return (marmitas || []).map((row) => {
    if (getMarmitaGrupoConflictScope(row.grupoId) !== scope) return row;
    return { ...row, ativo: row.id === keepId };
  });
}

export function inferDiaSemanaFromGrupoNome(nome) {
  const text = String(nome || '').trim().toLowerCase();
  const match = [
    { id: 'segunda', label: 'segunda-feira' },
    { id: 'terca', label: 'terça-feira' },
    { id: 'quarta', label: 'quarta-feira' },
    { id: 'quinta', label: 'quinta-feira' },
    { id: 'sexta', label: 'sexta-feira' },
    { id: 'sabado', label: 'sábado' },
    { id: 'domingo', label: 'domingo' },
  ].find((day) => day.label === text);
  return match?.id || '';
}

export function getHiddenItemIdsForDate(marmita, date = new Date(), timeZone = DEFAULT_STORE_TIMEZONE) {
  const key = getMarmitaDateKey(date, timeZone);
  const dayExc = marmita?.excecoesDia?.[key];
  return new Set(Array.isArray(dayExc?.ocultarItens) ? dayExc.ocultarItens.filter(Boolean) : []);
}

export function isItemHiddenOnDate(marmita, itemId, date = new Date(), timeZone = DEFAULT_STORE_TIMEZONE) {
  return getHiddenItemIdsForDate(marmita, date, timeZone).has(itemId);
}

export function toggleItemHiddenOnDate(marmita, itemId, hidden, date = new Date(), timeZone = DEFAULT_STORE_TIMEZONE) {
  const key = getMarmitaDateKey(date, timeZone);
  const excecoesDia = { ...(marmita.excecoesDia || {}) };
  const dayExc = { ...(excecoesDia[key] || {}) };
  const set = new Set(Array.isArray(dayExc.ocultarItens) ? dayExc.ocultarItens : []);

  if (hidden) set.add(itemId);
  else set.delete(itemId);

  if (set.size) {
    excecoesDia[key] = { ...dayExc, ocultarItens: [...set] };
  } else {
    delete excecoesDia[key];
  }

  return { ...marmita, excecoesDia };
}

function marmitaMatchesWeekday(diaSemana, weekday) {
  const day = normalizeMarmitaDiaSemana(diaSemana);
  return day === 'todos' || day === weekday;
}

/** Escolhe quais marmitas entram no cardápio público na data informada. */
export function selectMarmitasForPublicDate(
  marmitas,
  { date = new Date(), timeZone = DEFAULT_STORE_TIMEZONE } = {}
) {
  const weekday = getCurrentWeekdayKey(date, timeZone);
  const active = (marmitas || [])
    .filter((row) => row.ativo !== false)
    .map(normalizeMarmita);

  const forToday = active.filter((row) => marmitaMatchesWeekday(row.diaSemana, weekday));
  if (forToday.length) {
    return { mode: 'today', marmitas: forToday, isVitrine: false, weekday };
  }

  const vitrine = active.filter((row) => row.vitrine === true);
  if (vitrine.length) {
    return { mode: 'vitrine', marmitas: vitrine, isVitrine: true, weekday };
  }

  return { mode: 'empty', marmitas: [], isVitrine: false, weekday };
}

export function buildMarmitaAdminPreview(parsed, { date = new Date(), timeZone = DEFAULT_STORE_TIMEZONE } = {}) {
  const selection = selectMarmitasForPublicDate(parsed.marmitas, { date, timeZone });
  const weekdayLabel = getMarmitaWeekdayLabel(selection.weekday);
  const dateKey = getMarmitaDateKey(date, timeZone);

  if (!selection.marmitas.length) {
    return {
      ...selection,
      weekdayLabel,
      dateKey,
      headline: `Nada visível hoje (${weekdayLabel})`,
      detail:
        'Cadastre e ative uma marmita para este dia ou marque uma marmita como vitrine de preços.',
      marmita: null,
      sizes: [],
      steps: [],
    };
  }

  const marmita = selection.marmitas[0];
  const activeSizes = marmita.tamanhos.filter((tam) => tam.ativo !== false);

  const headline =
    selection.mode === 'vitrine'
      ? `Vitrine de preços (${weekdayLabel})`
      : `Cardápio de hoje (${weekdayLabel})`;

  const detail =
    selection.mode === 'vitrine'
      ? selection.marmitas.length > 1
        ? `${selection.marmitas.length} marmitas de referência visíveis quando não há cardápio do dia.`
        : `Sem marmita do dia ativa. O cliente vê "${marmita.nomePublico}" só como referência de preços.`
      : selection.marmitas.length > 1
        ? `${selection.marmitas.length} marmitas ativas para ${weekdayLabel}.`
        : `"${marmita.nomePublico}" está ativa para ${weekdayLabel}.`;

  if (selection.mode === 'vitrine') {
    return {
      ...selection,
      weekdayLabel,
      dateKey,
      headline,
      detail,
      marmita,
      sizes: activeSizes,
      steps: [],
    };
  }

  const hiddenIds = getHiddenItemIdsForDate(marmita, date, timeZone);
  const addonSections = buildMarmitaAddonSections(parsed, marmita, { date, timeZone });

  return {
    ...selection,
    weekdayLabel,
    dateKey,
    headline,
    detail,
    marmita,
    sizes: activeSizes,
    steps: addonSections,
    hiddenIds,
  };
}
