import { STORE_REVIEWS_UI_ENABLED } from '@/lib/features';
import { isMarmitaSegment, isPizzariaSegment } from '@/lib/empresaSegmentos';

export const ADMIN_MOBILE_MAX_WIDTH = 768;

/**
 * Catálogo completo do menu mobile (mesma ordem da sidebar desktop).
 * Pizzas/Marmitas entram no drawer só quando o segmento da loja tiver.
 * Para liberar uma tela: incluir o href em ADMIN_MOBILE_ALLOWED_PATHS.
 */
export const ADMIN_MOBILE_ROADMAP = [
  { href: '/admin/pedidos', label: 'Pedidos', icon: 'orders' },
  { href: '/admin/pizzas', label: 'Pizzas', icon: 'pizzas' },
  { href: '/admin/marmitas', label: 'Marmitas', icon: 'marmitas' },
  { href: '/admin/produtos', label: 'Produtos', icon: 'products' },
  { href: '/admin/adicionais', label: 'Adicionais', icon: 'addons' },
  { href: '/admin/promocoes', label: 'Promoções', icon: 'promos' },
  { href: '/admin/cupons', label: 'Cupons', icon: 'coupons' },
  { href: '/admin/clientes', label: 'Clientes', icon: 'clients' },
  { href: '/admin/entrega', label: 'Entrega', icon: 'delivery' },
  { href: '/admin/loja', label: 'Minha loja', icon: 'store' },
  { href: '/admin/avaliacoes', label: 'Avaliações', icon: 'reviews' },
  { href: '/admin/integracoes', label: 'Integrações', icon: 'integrations' },
  { href: '/admin/relatorios', label: 'Relatórios', icon: 'reports' },
];

/** Rotas já usáveis no celular (allowlist). */
export const ADMIN_MOBILE_ALLOWED_PATHS = [
  '/admin/loja',
  '/admin/relatorios',
  '/admin/cupons',
  '/admin/promocoes',
  '/admin/integracoes',
  '/admin/entrega',
  '/admin/clientes',
  '/admin/produtos',
  '/admin/adicionais',
  '/admin/pizzas',
  '/admin/marmitas',
  '/admin/pedidos',
];

/** Itens do drawer = roadmap ∩ allowlist (mesma ordem do roadmap). */
export const ADMIN_MOBILE_NAV = ADMIN_MOBILE_ROADMAP.filter((item) =>
  ADMIN_MOBILE_ALLOWED_PATHS.includes(item.href)
);

/** Filtra pizzas/marmitas/avaliações como na sidebar desktop. */
export function filterAdminMobileRoadmapForStore(items, loja = {}) {
  const segmento = loja?.segmento;
  return (items || []).filter((item) => {
    if (item.href === '/admin/pizzas' && !isPizzariaSegment(segmento)) return false;
    if (item.href === '/admin/marmitas' && !isMarmitaSegment(segmento)) return false;
    if (item.href === '/admin/avaliacoes' && !STORE_REVIEWS_UI_ENABLED) return false;
    return true;
  });
}

export function getAdminMobileNavItems(loja = {}) {
  return filterAdminMobileRoadmapForStore(ADMIN_MOBILE_NAV, loja);
}

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

export function resolveAdminMobileRedirect(pathname = '', { isMobile = false } = {}) {
  const path = String(pathname || '').trim();

  if (!isMobile) {
    if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
      return path;
    }
    return '/admin/pedidos';
  }

  if (isAdminMobileAllowedPath(path)) return path;
  return '/admin/relatorios';
}

/** Telas do roadmap ainda bloqueadas no mobile (respeitando segmento). */
export function getAdminMobileBlockedNavItems(loja = {}) {
  return filterAdminMobileRoadmapForStore(
    ADMIN_MOBILE_ROADMAP.filter((item) => !ADMIN_MOBILE_ALLOWED_PATHS.includes(item.href)),
    loja
  );
}

/**
 * Nota do drawer: o que ainda falta no celular.
 * Retorna '' quando tudo do roadmap já está liberado.
 */
export function getAdminMobileDesktopNote(loja = {}) {
  const blocked = getAdminMobileBlockedNavItems(loja);
  if (!blocked.length) return '';

  const labels = blocked.map((item) => item.label);
  const previewLimit = 4;
  let listText;
  if (labels.length <= previewLimit) {
    if (labels.length === 1) listText = labels[0];
    else if (labels.length === 2) listText = `${labels[0]} e ${labels[1]}`;
    else {
      listText = `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
    }
  } else {
    listText = `${labels.slice(0, previewLimit).join(', ')} e outras funções`;
  }

  return `Ainda no computador: ${listText}. Use o painel no PC para essas telas.`;
}
