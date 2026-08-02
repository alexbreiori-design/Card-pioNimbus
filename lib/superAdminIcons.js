/**
 * Ícones do super-admin (/admin/sistema) — arquivos em public/icons/
 *
 * Logo na sidebar: PNG branca em public/images/
 */
export const SUPER_ADMIN_LOGO = '/images/logo-full-branca.png';

export const SUPER_ADMIN_FILE_ICONS = {
  home: '/icons/sistema-home.svg',
  stores: '/icons/sistema-stores.svg',
  reports: '/icons/sistema-reports.svg',
  configuracoes: '/icons/sistema-admin.svg',
  model: '/icons/sistema-model.svg',
  comercial: '/icons/sistema-comercial.svg',
  inbox: '/icons/sistema-inbox.svg',
  novidades: '/icons/sistema-novidades.svg',
};

export function getSuperAdminIconPath(name) {
  return SUPER_ADMIN_FILE_ICONS[name] || null;
}
