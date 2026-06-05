/**
 * Ícones do admin carregados de /public/icons/ (substituem o desenho inline do AdminIcon).
 *
 * Como trocar um ícone:
 * 1. Coloque o SVG em public/icons/nome.svg (fill="#000" inline — sem CSS externo)
 * 2. Registre abaixo: nomeDoIcone: '/icons/nome.svg'
 * 3. Use <AdminIcon name="nomeDoIcone" />
 *
 * ── Registrados em arquivo (adminFileIcons.js) ──
 * store   → Minha loja (components/admin/StoreIcon.jsx — SVG inline)
 * pix     → Pagamento Pix (seção Minha loja)
 *
 * ── Sidebar (NavIcon — inline, ainda não via arquivo) ──
 * orders, products, addons, promos, coupons, clients, delivery, integrations
 * (+ store via arquivo acima)
 *
 * ── AdminIcon inline (components/admin/AdminIcon.jsx) ──
 * search, archive, plus, orders, prep, delivery, done, burger, category,
 * customer, phone, clock, location, cart, image, sort, printer, promo,
 * coupon, customers, integration, edit, pix, store, meta
 *
 * ── Títulos de página (AdminPageHeader) ──
 * coupon, integration, promo, … (mesmos nomes do AdminIcon)
 *
 * ── Categorias de produtos/adicionais (lib/categoryIcons.js → public/icons/) ──
 * burger, pizza, drink, dessert, salad, combo, promo
 */
export const ADMIN_FILE_ICONS = {
  pix: '/icons/pix.svg',
};

export function getAdminFileIconPath(name) {
  return ADMIN_FILE_ICONS[name] || null;
}

export const ADMIN_ICON_NAMES = Object.keys(ADMIN_FILE_ICONS);
