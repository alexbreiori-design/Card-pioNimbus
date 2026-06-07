import { getCurrentWeekdayKey, DEFAULT_STORE_TIMEZONE } from '@/lib/storeHours';
import { getMarmitaWeekdayLabel } from '@/lib/marmita/marmitaWeekdays';
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

export function findActiveMarmitaDayConflict(marmitas, { marmitaId, diaSemana, ativo }) {
  if (ativo === false || !diaSemana) return null;
  return (
    (marmitas || []).find(
      (row) => row.id !== marmitaId && row.ativo !== false && row.diaSemana === diaSemana
    ) || null
  );
}

export function formatMarmitaDayConflictMessage(conflict) {
  if (!conflict) return '';
  const tag = conflict.tagAdmin || conflict.nomePublico || 'Outra marmita';
  return `Já existe uma marmita ativa em ${getMarmitaWeekdayLabel(conflict.diaSemana)}: "${tag}". Desative-a antes ou corrija o dia da semana desta marmita.`;
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

/** Escolhe quais marmitas entram no cardápio público na data informada. */
export function selectMarmitasForPublicDate(
  marmitas,
  { date = new Date(), timeZone = DEFAULT_STORE_TIMEZONE } = {}
) {
  const weekday = getCurrentWeekdayKey(date, timeZone);
  const active = (marmitas || [])
    .filter((row) => row.ativo !== false)
    .map(normalizeMarmita);

  const forToday = active.filter((row) => !row.diaSemana || row.diaSemana === weekday);
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
      exceptionItems: [],
    };
  }

  const marmita = selection.marmitas[0];
  const hiddenIds = getHiddenItemIdsForDate(marmita, date, timeZone);
  const addonSections = buildMarmitaAddonSections(parsed, marmita, { date, timeZone });
  const activeSizes = marmita.tamanhos.filter((tam) => tam.ativo !== false);

  const exceptionItems = [];
  marmita.passos.forEach((passo) => {
    const categoryItems = (parsed.adicionaisItens || []).filter(
      (item) => item.categoriaId === passo.categoriaAdicionalId && item.ativo !== false
    );
    let items = categoryItems;
    if (Array.isArray(passo.itemIds) && passo.itemIds.length) {
      const allowed = new Set(passo.itemIds);
      items = items.filter((item) => allowed.has(item.id));
    }
    items.forEach((item) => {
      exceptionItems.push({
        id: item.id,
        nome: item.nome,
        passo: passo.titulo || passo.categoriaAdicionalId,
        hidden: hiddenIds.has(item.id),
      });
    });
  });

  const headline =
    selection.mode === 'vitrine'
      ? `Vitrine de preços (${weekdayLabel})`
      : `Cardápio de hoje (${weekdayLabel})`;

  const detail =
    selection.mode === 'vitrine'
      ? `Sem marmita do dia ativa. O cliente vê "${marmita.nomePublico}" só como referência de preços.`
      : `"${marmita.nomePublico}" está ativa para ${weekdayLabel}.`;

  return {
    ...selection,
    weekdayLabel,
    dateKey,
    headline,
    detail,
    marmita,
    sizes: activeSizes,
    steps: addonSections,
    exceptionItems,
  };
}
