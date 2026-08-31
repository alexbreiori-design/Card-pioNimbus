/** Remove sufixo "Opção (Nome do passo)" para exibição. */
export function stripCartOptStepSuffix(label = '') {
  const text = String(label || '').trim();
  const match = text.match(/^(.+?)\s*\([^)]+\)\s*$/);
  return match ? match[1].trim() : text;
}

/** Extrai sufixo de passo sem alterar o núcleo (qty + nome). */
export function splitCartOptStep(label = '') {
  const text = String(label || '').trim();
  if (!text) return { core: '', step: '' };
  const match = text.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (!match) return { core: text, step: '' };
  return { core: match[1].trim(), step: match[2].trim() };
}

export function getCartOptLabel(opt) {
  if (opt == null) return '';
  if (typeof opt === 'string') return stripCartOptStepSuffix(opt);
  return stripCartOptStepSuffix(opt.label || '');
}

export function getCartOptLabels(opts = []) {
  return (opts || []).map(getCartOptLabel).filter(Boolean);
}

/** Rótulo persistido no pedido — mantém (passo) para o servidor precificar certo. */
export function formatCartOptForStorage(opt) {
  if (opt == null) return '';
  if (typeof opt === 'string') return String(opt).trim();
  const label = String(opt.label || '').trim();
  if (!label) return '';
  const step = String(opt.step || '').trim();
  if (!step) return label;
  if (/\s*\([^)]+\)\s*$/.test(label)) return label;
  return `${label} (${step})`;
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

/** Texto persistido no pedido (rótulos + passo + observação livre). */
export function formatCartObsForStorage(opts = [], note = '') {
  const base = (opts || []).map(formatCartOptForStorage).filter(Boolean).join(', ');
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
