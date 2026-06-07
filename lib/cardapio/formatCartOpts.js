export function formatCartOpt(opt) {
  if (opt == null) return '';
  if (typeof opt === 'string') return opt;
  const label = String(opt.label || '').trim();
  const step = String(opt.step || '').trim();
  if (label && step) return `${label} (${step})`;
  return label || step;
}

export function formatCartOptsList(opts = []) {
  return (opts || []).map(formatCartOpt).filter(Boolean).join(', ');
}
