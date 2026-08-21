export const MODELO_SEGMENTO_ID = 'modelo';

export const EMPRESA_SEGMENTOS = [
  { id: 'restaurante', label: 'Restaurante' },
  { id: 'marmitaria', label: 'Marmitaria' },
  { id: 'hamburgueria', label: 'Hamburgueria' },
  { id: 'pizzaria', label: 'Pizzaria' },
  { id: 'lanchonete', label: 'Lanchonete' },
  { id: 'pastelaria', label: 'Pastelaria' },
  { id: 'padaria', label: 'Padaria e Confeitaria' },
  { id: 'sorveteria', label: 'Sorveteria / Açaiteria' },
  { id: 'cafeteria', label: 'Cafeteria' },
  { id: 'petiscaria', label: 'Petiscaria' },
];

/** IDs antigos (lista longa) → id atual após o filtro de nichos. */
const SEGMENTO_ALIASES = {
  acaiteria: 'sorveteria',
  confeitaria: 'padaria',
  doceria: 'padaria',
  fast_food: 'lanchonete',
  food_truck: 'lanchonete',
};

const DEFAULT_OBSERVATION_PLACEHOLDER = 'Ex.: sem cebola, ponto da carne, etc. (opcional)';

const OBSERVATION_PLACEHOLDER_BY_SEGMENTO = {
  hamburgueria: 'Ex.: sem cebola, bem passado, sem molho, etc. (opcional)',
  lanchonete: 'Ex.: sem cebola, bem passado, sem molho, etc. (opcional)',
  pastelaria: 'Ex.: sem cebola, bem passado, sem molho, etc. (opcional)',
  pizzaria: 'Ex.: borda bem assada, sem cebola, cortar ao meio, etc. (opcional)',
  padaria: 'Ex.: pouco açúcar, calda à parte, sem granulado, etc. (opcional)',
  sorveteria: 'Ex.: sem granola, banana à parte, pouco leite condensado, etc. (opcional)',
  cafeteria: 'Ex.: pouco açúcar, sem creme, leite à parte, etc. (opcional)',
  petiscaria: 'Ex.: sem cebola, molho à parte, bem temperado, etc. (opcional)',
};

/** Normaliza segmento (inclui aliases legados como acaiteria → sorveteria). */
export function normalizeSegmentoId(segmento) {
  const id = String(segmento || '').trim().toLowerCase();
  if (!id) return '';
  return SEGMENTO_ALIASES[id] || id;
}

export function getSegmentoLabel(segmento) {
  const id = normalizeSegmentoId(segmento);
  if (!id) return '';
  if (id === MODELO_SEGMENTO_ID) return 'Modelo (testes Nimbus)';
  return EMPRESA_SEGMENTOS.find((item) => item.id === id)?.label || id;
}

export function isModeloSegment(segmento) {
  return normalizeSegmentoId(segmento) === MODELO_SEGMENTO_ID;
}

export function isPizzariaSegment(segmento) {
  const id = normalizeSegmentoId(segmento);
  return id === 'pizzaria' || id === MODELO_SEGMENTO_ID;
}

/** Segmentos que exibem o módulo Marmitas no admin e projeção de cards por tamanho. */
export const MARMITA_SEGMENTOS = ['restaurante', 'marmitaria'];

export function isMarmitaSegment(segmento) {
  const id = normalizeSegmentoId(segmento);
  return id === MODELO_SEGMENTO_ID || MARMITA_SEGMENTOS.includes(id);
}

export function getObservationPlaceholder(segmento) {
  const id = normalizeSegmentoId(segmento);
  return OBSERVATION_PLACEHOLDER_BY_SEGMENTO[id] || DEFAULT_OBSERVATION_PLACEHOLDER;
}

export function getObservationStepHint(segmento) {
  const placeholder = getObservationPlaceholder(segmento);
  const examples = placeholder.replace(/^Ex\.:\s*/i, '').replace(/\s*\(opcional\)\s*$/i, '');
  return `Campo opcional para detalhes do pedido (ex.: ${examples}).`;
}

export function filterSegmentos(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return EMPRESA_SEGMENTOS;
  return EMPRESA_SEGMENTOS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.id.replace(/_/g, ' ').includes(q)
  );
}
