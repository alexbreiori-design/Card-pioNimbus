/**
 * Ícones do admin carregados de /public/icons/ (substituem o desenho inline do AdminIcon).
 *
 * Como trocar um ícone:
 * 1. Coloque o SVG em public/icons/nome.svg (fill="#000" inline — sem CSS externo)
 * 2. Registre abaixo: nomeDoIcone: '/icons/nome.svg'
 * 3. Use <AdminIcon name="nomeDoIcone" />
 *
 * ── Inline dedicados (AdminIcon) ──
 * store → StoreIcon.jsx · pix → PixIcon.jsx
 * (SVG inline evita falhas de CSS mask com viewBox minúsculo)
 *
 * ── Sidebar (NavIcon — inline, ainda não via arquivo) ──
 * orders, products, addons, promos, coupons, clients, delivery, integrations
 *
 * ── AdminIcon inline (components/admin/AdminIcon.jsx) ──
 * search, archive, plus, orders, prep, delivery, done, burger, category,
 * customer, phone, clock, location, cart, image, sort, printer, promo,
 * coupon, customers, integration, edit, pix, store, meta
 *
 * ── Títulos de página (AdminPageHeader) ──
 * coupon, integration, promo, … (mesmos nomes do AdminIcon)
 *
 * ── Categorias de produtos/adicionais (public/icons/) ──
 * Novos SVGs em public/icons/ aparecem automaticamente no admin (exceto sistema-*, pix, store, logo, marmita).
 * Ícones com traço (*-stroke-rounded) renderizam como imagem; ícones fill usam tinte da marca.
 *
 * ── Super-admin (/admin/sistema) — ver lib/superAdminIcons.js ──
 * logo-nimbus-light.svg, sistema-home.svg, sistema-stores.svg, sistema-admin.svg, sistema-model.svg
 */
export const ADMIN_FILE_ICONS = {};

export function getAdminFileIconPath(name) {
  return ADMIN_FILE_ICONS[name] || null;
}

export const ADMIN_ICON_NAMES = Object.keys(ADMIN_FILE_ICONS);
