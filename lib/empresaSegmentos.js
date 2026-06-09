export const MODELO_SEGMENTO_ID = 'modelo';

export const EMPRESA_SEGMENTOS = [
  { id: 'restaurante', label: 'Restaurante' },
  { id: 'marmitaria', label: 'Marmitaria' },
  { id: 'hamburgueria', label: 'Hamburgueria' },
  { id: 'pizzaria', label: 'Pizzaria' },
  { id: 'lanchonete', label: 'Lanchonete' },
  { id: 'fast_food', label: 'Fast food' },
  { id: 'food_truck', label: 'Food truck' },
  { id: 'padaria', label: 'Padaria' },
  { id: 'confeitaria', label: 'Confeitaria' },
  { id: 'doceria', label: 'Doceria' },
  { id: 'sorveteria', label: 'Sorveteria' },
  { id: 'acaiteria', label: 'Açaiteria' },
  { id: 'cafeteria', label: 'Cafeteria' },
  { id: 'pastelaria', label: 'Pastelaria' },
  { id: 'churrascaria', label: 'Churrascaria' },
  { id: 'comida_japonesa', label: 'Comida japonesa' },
  { id: 'comida_chinesa', label: 'Comida chinesa' },
  { id: 'comida_arabe', label: 'Comida árabe' },
  { id: 'comida_mexicana', label: 'Comida mexicana' },
  { id: 'comida_italiana', label: 'Comida italiana' },
  { id: 'comida_vegetariana', label: 'Comida vegetariana' },
  { id: 'comida_saudavel', label: 'Comida saudável' },
  { id: 'peixaria', label: 'Peixaria' },
  { id: 'bar', label: 'Bar' },
  { id: 'pub', label: 'Pub' },
  { id: 'cervejaria', label: 'Cervejaria' },
  { id: 'petiscaria', label: 'Petiscaria' },
  { id: 'buffet', label: 'Buffet' },
  { id: 'self_service', label: 'Self service' },
  { id: 'dark_kitchen', label: 'Dark kitchen' },
];

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
export const MARMITA_SEGMENTOS = [
  'restaurante',
  'marmitaria',
  'churrascaria',
  'comida_japonesa',
  'comida_chinesa',
  'comida_arabe',
  'comida_mexicana',
  'comida_italiana',
  'comida_vegetariana',
  'comida_saudavel',
];

export function isMarmitaSegment(segmento) {
  const id = String(segmento || '').trim().toLowerCase();
  return id === MODELO_SEGMENTO_ID || MARMITA_SEGMENTOS.includes(id);
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
