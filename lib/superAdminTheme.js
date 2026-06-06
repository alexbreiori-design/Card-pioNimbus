export const SISTEMA_THEME_STORAGE_KEY = 'nimbus-sistema-theme';

export function getStoredSistemaTheme() {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(SISTEMA_THEME_STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
}

export function storeSistemaTheme(theme) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SISTEMA_THEME_STORAGE_KEY, theme === 'dark' ? 'dark' : 'light');
}
