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

const DEFAULT_OBSERVATION_PLACEHOLDER = 'Ex.: sem cebola, ponto da carne, etc. (opcional)';

const OBSERVATION_PLACEHOLDER_BY_SEGMENTO = {
  hamburgueria: 'Ex.: sem cebola, bem passado, sem molho, etc. (opcional)',
  lanchonete: 'Ex.: sem cebola, bem passado, sem molho, etc. (opcional)',
  pastelaria: 'Ex.: sem cebola, bem passado, sem molho, etc. (opcional)',
  pizzaria: 'Ex.: borda bem assada, sem cebola, cortar ao meio, etc. (opcional)',
  padaria: 'Ex.: pouco açúcar, calda à parte, sem granulado, etc. (opcional)',
  sorveteria: 'Ex.: pouco açúcar, calda à parte, sem granulado, etc. (opcional)',
  cafeteria: 'Ex.: pouco açúcar, calda à parte, sem granulado, etc. (opcional)',
  petiscaria: 'Ex.: sem cebola, molho à parte, bem temperado, etc. (opcional)',
};

export function getSegmentoLabel(segmento) {
  const id = String(segmento || '').trim();
  if (!id) return '';
  if (id.toLowerCase() === MODELO_SEGMENTO_ID) return 'Modelo (testes Nimbus)';
  return EMPRESA_SEGMENTOS.find((item) => item.id === id)?.label || id;
}

export function isModeloSegment(segmento) {
  return String(segmento || '').trim().toLowerCase() === MODELO_SEGMENTO_ID;
}

export function isPizzariaSegment(segmento) {
  const id = String(segmento || '').trim().toLowerCase();
  return id === 'pizzaria' || id === MODELO_SEGMENTO_ID;
}

/** Segmentos que exibem o módulo Marmitas no admin e projeção de cards por tamanho. */
export const MARMITA_SEGMENTOS = ['restaurante', 'marmitaria'];

export function isMarmitaSegment(segmento) {
  const id = String(segmento || '').trim().toLowerCase();
  return id === MODELO_SEGMENTO_ID || MARMITA_SEGMENTOS.includes(id);
}

export function getObservationPlaceholder(segmento) {
  const id = String(segmento || '').trim().toLowerCase();
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
