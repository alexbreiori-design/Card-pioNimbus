import { formatCartObsForStorage } from '@/lib/cardapio/formatCartOpts';
import {
  formatAddonOptLabel,
  getAddonStepBadge,
  isAddonSectionComplete,
  sectionToQtyMap,
} from '@/lib/cardapio/addonSelection';

export function getMarmitaStepMin(section) {
  if (!section) return 0;
  return section.required ? Math.max(1, Number(section.min || 1)) : Number(section.min || 0);
}

export function isMarmitaStepComplete(section, selected = []) {
  return isAddonSectionComplete(section, selected);
}

export function getMarmitaStepBadge(section, selected = []) {
  return getAddonStepBadge(section, selected);
}

export function findFirstIncompleteMarmitaStep(sections, selectedAddons) {
  for (let index = 0; index < sections.length; index += 1) {
    if (!isMarmitaStepComplete(sections[index], selectedAddons[index])) return index;
  }
  return -1;
}

export function formatMarmitaCartObs(opts = [], note = '') {
  return formatCartObsForStorage(opts, note);
}

export function buildMarmitaCartOpts(product, selectedAddons) {
  const opts = [];
  (product?.addons || []).forEach((section, sectionIndex) => {
    const map = sectionToQtyMap(selectedAddons[sectionIndex]);
    Object.entries(map).forEach(([itemId, qty]) => {
      const item = section.items.find((entry) => entry.id === itemId);
      if (!item) return;
      opts.push({
        label: formatAddonOptLabel(item.name, qty),
        step: section.stepTitle || section.section,
      });
    });
  });
  return opts;
}
