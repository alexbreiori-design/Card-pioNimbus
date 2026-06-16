export function getMarmitaStepMin(section) {
  if (!section) return 0;
  return section.required ? Math.max(1, Number(section.min || 1)) : Number(section.min || 0);
}

export function isMarmitaStepComplete(section, selected = []) {
  return selected.length >= getMarmitaStepMin(section);
}

export function getMarmitaStepBadge(section, selected = []) {
  const min = getMarmitaStepMin(section);
  const max = Math.max(min, Number(section?.max || 1));
  if (selected.length < min) {
    const missing = min - selected.length;
    return { text: `Falta ${missing}`, tone: 'missing' };
  }
  return { text: `✓ ${selected.length}/${max}`, tone: 'done' };
}

export function findFirstIncompleteMarmitaStep(sections, selectedAddons) {
  for (let index = 0; index < sections.length; index += 1) {
    const selected = selectedAddons[index] || [];
    if (!isMarmitaStepComplete(sections[index], selected)) return index;
  }
  return -1;
}

export function formatMarmitaCartObs(opts = []) {
  return (opts || [])
    .map((opt) => {
      if (opt == null) return '';
      if (typeof opt === 'string') return opt.trim();
      return String(opt.label || '').trim();
    })
    .filter(Boolean)
    .join(', ');
}

export function buildMarmitaCartOpts(product, selectedAddons) {
  const opts = [];
  (product?.addons || []).forEach((section, sectionIndex) => {
    const selected = selectedAddons[sectionIndex] || [];
    selected.forEach((itemId) => {
      const item = section.items.find((entry) => entry.id === itemId);
      if (!item) return;
      opts.push({
        label: item.name,
        step: section.stepTitle || section.section,
      });
    });
  });
  return opts;
}
