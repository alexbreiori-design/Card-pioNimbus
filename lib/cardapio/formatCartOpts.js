/** Remove sufixo legado "Opção (Nome do passo)". */
export function stripCartOptStepSuffix(label = '') {
  const text = String(label || '').trim();
  const match = text.match(/^(.+?)\s*\([^)]+\)\s*$/);
  return match ? match[1].trim() : text;
}

export function getCartOptLabel(opt) {
  if (opt == null) return '';
  if (typeof opt === 'string') return stripCartOptStepSuffix(opt);
  return stripCartOptStepSuffix(opt.label || '');
}

export function getCartOptLabels(opts = []) {
  return (opts || []).map(getCartOptLabel).filter(Boolean);
}

export function splitCartObsParts(obs = '') {
  const text = String(obs || '').trim();
  if (!text) return [];
  if (text.includes('\n')) {
    return text
      .split('\n')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return text
    .split(/,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function getCartObsLabels({ opts, obs, note } = {}) {
  const labels = opts?.length
    ? getCartOptLabels(opts)
    : splitCartObsParts(obs).map(stripCartOptStepSuffix).filter(Boolean);
  const noteText = String(note || '').trim();
  if (noteText) labels.push(`Obs: ${noteText}`);
  return labels;
}

/** Texto persistido no pedido (rótulos das opções + observação livre). */
export function formatCartObsForStorage(opts = [], note = '') {
  const base = getCartOptLabels(opts).join(', ');
  const noteText = String(note || '').trim();
  if (!noteText) return base;
  return base ? `${base}\nObs: ${noteText}` : `Obs: ${noteText}`;
}

/** @deprecated Preferir getCartObsLabels + CartItemOptsList */
export function formatCartOpt(opt) {
  return getCartOptLabel(opt);
}

/** @deprecated Preferir getCartObsLabels + CartItemOptsList */
export function formatCartOptsList(opts = []) {
  return getCartOptLabels(opts).join(', ');
}

export function formatCartObsWhatsAppBlock({ opts, obs } = {}) {
  const labels = getCartObsLabels({ opts, obs });
  if (!labels.length) return '';
  return `\n${labels.map((label) => `  - ${label}`).join('\n')}`;
}
