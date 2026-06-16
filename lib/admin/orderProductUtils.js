import { buildMarmitaCartOpts } from '@/lib/marmita/marmitaWizard';
import {
  buildPizzaCartLabels,
  buildPizzaWizardSteps,
  computePizzaWizardUnitPrice,
  findFirstIncompletePizzaStep,
} from '@/lib/pizza/pizzaWizard';
import { findFirstIncompleteMarmitaStep } from '@/lib/marmita/marmitaWizard';

export function recalcAddonExtras(product, selectedAddons) {
  let extras = 0;
  if (!product?.addons) return 0;
  product.addons.forEach((section, sectionIndex) => {
    const selected = selectedAddons[sectionIndex] || [];
    selected.forEach((itemId) => {
      const item = section.items.find((entry) => entry.id === itemId);
      if (item) extras += Number(item.extra || 0);
    });
  });
  return extras;
}

export function productNeedsConfiguration(product) {
  if (!product?.catalogProduct) return false;
  const catalog = product.catalogProduct;
  if (catalog.type === 'pizza' && catalog.pizzaConfig) return true;
  if (catalog.type === 'marmita' && (catalog.addons || []).length > 0) return true;
  if ((catalog.addons || []).length > 0) return true;
  return false;
}

export function buildCartItemFromConfiguration({
  product,
  qty = 1,
  pizzaState = null,
  selectedAddons = {},
  addonExtras = 0,
}) {
  const catalog = product.catalogProduct;
  if (!catalog) {
    return {
      produtoId: product.id,
      nome: product.nome,
      preco: Number(product.preco || 0),
      medida: product.medida || '',
      qtd: qty,
      obs: '',
    };
  }

  if (catalog.type === 'pizza' && catalog.pizzaConfig && pizzaState) {
    const unitPrice = computePizzaWizardUnitPrice(catalog, pizzaState, addonExtras);
    const labels = buildPizzaCartLabels(catalog, pizzaState, selectedAddons);
    return {
      produtoId: product.id,
      nome: product.nome,
      preco: unitPrice,
      medida: '',
      qtd: qty,
      obs: labels.join(' · '),
    };
  }

  if (catalog.type === 'marmita') {
    const opts = buildMarmitaCartOpts(catalog, selectedAddons);
    const unitPrice = Number(catalog.price || product.preco || 0) + addonExtras;
    return {
      produtoId: product.id,
      nome: product.nome,
      preco: unitPrice,
      medida: catalog.tamanhoSelecionado?.nome || '',
      qtd: qty,
      obs: opts.map((entry) => entry.label).join(', '),
    };
  }

  const labels = [];
  (catalog.addons || []).forEach((section, sectionIndex) => {
    const selected = selectedAddons[sectionIndex] || [];
    selected.forEach((itemId) => {
      const item = section.items.find((entry) => entry.id === itemId);
      if (item?.name) labels.push(item.name);
    });
  });

  return {
    produtoId: product.id,
    nome: product.nome,
    preco: Number(catalog.price || product.preco || 0) + addonExtras,
    medida: '',
    qtd: qty,
    obs: labels.join(' · '),
  };
}

export function validateProductConfiguration(product, { pizzaState, selectedAddons, pizzaStep = 0 }) {
  const catalog = product?.catalogProduct;
  if (!catalog) return { ok: true };

  if (catalog.type === 'pizza' && catalog.pizzaConfig) {
    const steps = buildPizzaWizardSteps(catalog, pizzaState || { sizeId: '', flavorSlots: [] });
    const incomplete = findFirstIncompletePizzaStep(steps, pizzaState || {}, selectedAddons || {});
    if (incomplete >= 0) {
      return { ok: false, message: 'Complete a montagem da pizza antes de adicionar.', step: incomplete };
    }
    return { ok: true };
  }

  if (catalog.type === 'marmita' && (catalog.addons || []).length > 0) {
    const incomplete = findFirstIncompleteMarmitaStep(catalog.addons, selectedAddons || {});
    if (incomplete >= 0) {
      return { ok: false, message: 'Complete a montagem da marmita antes de adicionar.', step: incomplete };
    }
    return { ok: true };
  }

  for (let sectionIndex = 0; sectionIndex < (catalog.addons || []).length; sectionIndex += 1) {
    const section = catalog.addons[sectionIndex];
    const selected = selectedAddons[sectionIndex] || [];
    const minRequired = section.required ? Math.max(1, Number(section.min || 1)) : Number(section.min || 0);
    if (selected.length < minRequired) {
      return {
        ok: false,
        message: `Selecione as opções obrigatórias em "${section.section}".`,
        step: sectionIndex,
      };
    }
  }

  return { ok: true };
}
