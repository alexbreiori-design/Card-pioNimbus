'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminIcon from './AdminIcon';
import AdminLogoutButton from './AdminLogoutButton';
import AdminStoreSwitcher from './AdminStoreSwitcher';

const NAV = [
  { href: '/admin/pedidos', label: 'Pedidos', icon: 'orders' },
  { href: '/admin/produtos', label: 'Produtos', icon: 'products' },
  { href: '/admin/adicionais', label: 'Adicionais', icon: 'addons' },
  { href: '/admin/promocoes', label: 'Promoções', icon: 'promos' },
  { href: '/admin/cupons', label: 'Cupons', icon: 'coupons' },
  { href: '/admin/clientes', label: 'Clientes', icon: 'clients' },
  { href: '/admin/entrega', label: 'Entrega', icon: 'delivery' },
  { href: '/admin/loja', label: 'Minha loja', icon: 'store' },
  { href: '/admin/integracoes', label: 'Integrações', icon: 'integrations' },
];

function NavIcon({ name }) {
  if (name === 'store') {
    return <AdminIcon name="store" className="admin-nav-file-icon" />;
  }

  const icons = {
    orders: (
      <svg viewBox="0 0 24 24">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
      </svg>
    ),
    products: (
      <svg viewBox="0 0 24 24">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    addons: (
      <svg viewBox="0 0 24 24">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    promos: (
      <svg viewBox="0 0 24 24">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
    coupons: (
      <svg viewBox="0 0 24 24">
        <path d="M21 5H3a2 2 0 0 0-2 2v3a2 2 0 0 1 0 4v3a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2v-3a2 2 0 0 1 0-4V7a2 2 0 0 0-2-2z" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="15" y1="9" x2="9" y2="15" />
      </svg>
    ),
    clients: (
      <svg viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    ),
    delivery: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="10" r="3" />
        <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
      </svg>
    ),
    integrations: (
      <svg viewBox="0 0 24 24">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  };
  return icons[name] || null;
}

export default function AdminSidebar({
  storeName = 'Minha loja',
  storeSlug = '',
  logoUrl = '',
  isOpen = true,
  collapsed = false,
  newOrdersCount = 0,
  onToggleCollapse,
  onToggleOpen,
}) {
  const pathname = usePathname();
  const cardapioHref = storeSlug ? `/${String(storeSlug).trim().toLowerCase()}` : '';

  return (
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="admin-sidebar-header">
        <div className="admin-store-badge">
          <div className="admin-store-avatar">
            {logoUrl ? <img src={logoUrl} alt="Logo da loja" /> : 'N'}
          </div>
          {!collapsed ? (
            <div className="admin-store-name-block">
              {cardapioHref ? (
                <a
                  href={cardapioHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-store-name admin-store-name-link"
                  title="Abrir cardápio público"
                >
                  {storeName}
                </a>
              ) : (
                <div className="admin-store-name">{storeName}</div>
              )}
              {cardapioHref ? (
                <span className="admin-store-cardapio-hint">Clique para acessar o cardápio</span>
              ) : null}
            </div>
          ) : (
            <div className="admin-store-name">{storeName}</div>
          )}
        </div>
        <AdminStoreSwitcher collapsed={collapsed} />
        <div className="admin-toggle-row">
          <span className={`admin-toggle-label ${isOpen ? 'open' : 'closed'}`}>
            {isOpen ? 'Loja Aberta' : 'Loja Fechada'}
          </span>
          <label className="admin-switch">
            <input type="checkbox" checked={isOpen} onChange={(e) => onToggleOpen?.(e.target.checked)} />
            <span className="admin-switch-slider" />
          </label>
        </div>
        <button
          type="button"
          className="admin-sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={collapsed ? 'M9 7l6 5-6 5' : 'M15 7l-6 5 6 5'} />
          </svg>
        </button>
      </div>
      <nav className="admin-nav">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
            {item.href === '/admin/pedidos' && newOrdersCount > 0 ? (
              <span className="admin-nav-badge">{newOrdersCount > 99 ? '99+' : newOrdersCount}</span>
            ) : null}
          </Link>
        ))}
      </nav>
      <div className="admin-sidebar-footer">
        <AdminLogoutButton />
      </div>
    </aside>
  );
}
