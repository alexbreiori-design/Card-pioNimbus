/**
 * Ícones do super-admin (/admin/sistema) — arquivos em public/icons/
 *
 * Logo na sidebar roxa: PNG em public/images/ (mesmo padrão da tela de login)
 *
 * Navegação:
 *   sistema-home.svg   → Início
 *   sistema-stores.svg → Lojas
 *   sistema-model.svg   → Loja modelo (último item da sidebar)
 *   sistema-reports.svg → Relatórios / ranking
 *   sistema-admin.svg   → Configurações
 */
export const SUPER_ADMIN_LOGO = '/images/logo-fundo-colotido.png';

export const SUPER_ADMIN_FILE_ICONS = {
  home: '/icons/sistema-home.svg',
  stores: '/icons/sistema-stores.svg',
  reports: '/icons/sistema-reports.svg',
  configuracoes: '/icons/sistema-admin.svg',
  model: '/icons/sistema-model.svg',
};

export function getSuperAdminIconPath(name) {
  return SUPER_ADMIN_FILE_ICONS[name] || null;
}
