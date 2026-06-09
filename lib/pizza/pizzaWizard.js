import { computePizzaFlavorUnitPrice } from '@/lib/pizza/pizzaPricing';

export function getFlavorPriceForSize(pizzaConfig, flavorId, tamanhoId) {
  const key = `${flavorId}:${tamanhoId}`;
  const raw = pizzaConfig?.precoPorTamanhoSabor?.[key];
  const parsed = Number(String(raw ?? '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function getFlavorPoolForSize(product, tamanhoId) {
  const config = product?.pizzaConfig || {};
  const sabores = config.saboresSelecionados || [];
  return (product?.addons || [])
    .flatMap((section) => section.items || [])
    .filter((item) => sabores.includes(item.id))
    .filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index)
    .filter((item) => getFlavorPriceForSize(config, item.id, tamanhoId) > 0);
}

export function buildPizzaWizardSteps(product, state, { catalogProducts = [] } = {}) {
  if (!product?.pizzaConfig) return [];

  const config = product.pizzaConfig;
  const sizes = (config.tamanhoConfig || []).filter((item) => item.ativo !== false);
  const steps = [
    {
      type: 'size',
      id: 'size',
      title: 'Escolha o tamanho',
      hint: 'Defina o tamanho antes dos sabores.',
      required: true,
      sizes,
    },
  ];

  const selectedSize = sizes.find((item) => item.tamanhoId === state.sizeId);
  if (!selectedSize) return steps;

  const minSabores = Math.max(1, Number(config.minSabores || 1));
  const maxFlavors = Math.max(
    minSabores,
    Number(config.maxSabores || selectedSize.maxSabores || 1)
  );
  const flavorItems = getFlavorPoolForSize(product, state.sizeId);

  for (let slot = 0; slot < maxFlavors; slot += 1) {
    const required = slot < minSabores;
    steps.push({
      type: 'flavor',
      id: `flavor-${slot}`,
      title: slot === 0 ? 'Escolha o 1º sabor' : `Escolha o ${slot + 1}º sabor`,
      hint: required
        ? 'Obrigatório para continuar.'
        : maxFlavors > minSabores
          ? 'Opcional — avance sem escolher se não quiser mais sabores.'
          : '',
      required,
      slotIndex: slot,
      items: flavorItems,
    });
  }

  const addonSections = (product.addons || [])
    .map((section, index) => ({ section, index }))
    .filter((entry) => entry.section.section !== 'Sabores');

  addonSections.forEach(({ section, index }) => {
    steps.push({
      type: 'addons',
      id: `addons-${index}`,
      title: section.section,
      hint: section.required ? 'Seleção obrigatória.' : 'Opcional.',
      required: section.required === true,
      sectionIndex: index,
      section,
    });
  });

  const suggestions = (product.relatedProductIds || [])
    .map((id) => catalogProducts.find((item) => item.id === id))
    .filter(Boolean);

  if (suggestions.length) {
    steps.push({
      type: 'suggestions',
      id: 'suggestions',
      title: 'Aproveite também',
      hint: 'Sugestões para acompanhar sua pizza.',
      required: false,
      items: suggestions,
    });
  }

  return steps;
}

export function isPizzaStepComplete(step, state, selectedAddons) {
  if (!step) return false;
  if (step.type === 'size') return Boolean(state.sizeId);
  if (step.type === 'flavor') {
    const flavorId = state.flavorSlots?.[step.slotIndex];
    return step.required ? Boolean(flavorId) : true;
  }
  if (step.type === 'addons') {
    const selected = selectedAddons[step.sectionIndex] || [];
    const min = step.required ? Math.max(1, Number(step.section.min || 1)) : Number(step.section.min || 0);
    return selected.length >= min;
  }
  if (step.type === 'suggestions') return true;
  return true;
}

export function findFirstIncompletePizzaStep(steps, state, selectedAddons) {
  for (let index = 0; index < steps.length; index += 1) {
    if (!isPizzaStepComplete(steps[index], state, selectedAddons)) return index;
  }
  return -1;
}

export function getSelectedPizzaFlavorIds(state) {
  return (state.flavorSlots || []).filter(Boolean);
}

export function computePizzaWizardUnitPrice(product, state, addonExtras = 0) {
  const config = product?.pizzaConfig || {};
  const flavorIds = getSelectedPizzaFlavorIds(state);
  const flavorPrice = computePizzaFlavorUnitPrice(config, state.sizeId, flavorIds);
  return flavorPrice + addonExtras;
}

export function buildPizzaCartLabels(product, state, selectedAddons) {
  const config = product?.pizzaConfig || {};
  const size = (config.tamanhoConfig || []).find((item) => item.tamanhoId === state.sizeId);
  const flavorPool = getFlavorPoolForSize(product, state.sizeId);
  const labels = [];

  if (size) {
    labels.push(`Tamanho: ${size.tamanhoNome || size.tamanhoId}`);
  }

  getSelectedPizzaFlavorIds(state).forEach((flavorId) => {
    const flavor = flavorPool.find((item) => item.id === flavorId);
    if (flavor?.name) labels.push(flavor.name);
  });

  (product?.addons || []).forEach((section, sectionIndex) => {
    if (section.section === 'Sabores') return;
    const selected = selectedAddons[sectionIndex] || [];
    selected.forEach((itemId) => {
      const item = section.items.find((entry) => entry.id === itemId);
      if (item?.name) labels.push(item.name);
    });
  });

  return labels;
}
