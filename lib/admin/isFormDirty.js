export function isJsonDirty(current, baseline) {
  if (!baseline) return false;
  return JSON.stringify(current) !== JSON.stringify(baseline);
}

export function hasMeaningfulText(...values) {
  return values.some((value) => String(value || '').trim().length > 0);
}
