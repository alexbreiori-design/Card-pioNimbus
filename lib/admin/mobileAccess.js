export const ADMIN_MOBILE_MAX_WIDTH = 768;

export const ADMIN_MOBILE_ALLOWED_PATHS = ['/admin/loja', '/admin/relatorios'];

export const ADMIN_MOBILE_NAV = [
  { href: '/admin/loja', label: 'Minha loja', icon: 'store' },
  { href: '/admin/relatorios', label: 'Relatórios', icon: 'reports' },
];

export function isAdminMobileViewport(width = null) {
  if (typeof window === 'undefined') return false;
  const value = width ?? window.innerWidth;
  return value <= ADMIN_MOBILE_MAX_WIDTH;
}

export function isAdminMobileAllowedPath(pathname = '') {
  const path = String(pathname || '').split('?')[0];
  return ADMIN_MOBILE_ALLOWED_PATHS.some(
    (allowed) => path === allowed || path.startsWith(`${allowed}/`)
  );
}

export function resolveAdminMobileRedirect(pathname = '') {
  const path = String(pathname || '').trim();
  if (path === '/home') return '/home';
  if (isAdminMobileAllowedPath(path)) return path;
  return '/admin/relatorios';
}
