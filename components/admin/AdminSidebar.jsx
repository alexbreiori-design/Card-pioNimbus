'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminIcon from './AdminIcon';
import AdminLogoutButton from './AdminLogoutButton';
import AdminStoreSwitcher from './AdminStoreSwitcher';
import { useAdminData } from '@/hooks/useAdminData';
import { useAdminToast } from '@/context/AdminToastContext';
import {
  CaixaManageModal,
  CaixaSidebarStatus,
} from '@/components/admin/caixa/CaixaPanels';
import { isMarmitaSegment, isPizzariaSegment } from '@/lib/empresaSegmentos';
import { NIMBUS_SUPPORT_LABEL, NIMBUS_SUPPORT_URL } from '@/lib/nimbusSupport';
import { getStorePublicUrl } from '@/lib/siteUrl';

const BASE_NAV = [
  { href: '/admin/pedidos', label: 'Pedidos', icon: 'orders' },
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

function NavIcon({ name }) {
  if (name === 'store') {
    return <AdminIcon name="store" />;
  }

  if (name === 'orders') {
    return <i className="ph ph-clipboard-text admin-nav-phosphor-icon" aria-hidden="true" />;
  }

  if (name === 'pizzas') {
    return <i className="ph ph-pizza admin-nav-phosphor-icon" aria-hidden="true" />;
  }

  if (name === 'products') {
    return <ion-icon name="fast-food-outline" aria-hidden="true" />;
  }

  if (name === 'promos') {
    return <i className="ph ph-seal-percent admin-nav-phosphor-icon" aria-hidden="true" />;
  }

  if (name === 'reviews') {
    return <i className="ph ph-star admin-nav-phosphor-icon" aria-hidden="true" />;
  }

  const icons = {
    reports: (
      <svg viewBox="0 0 24 24">
        <path d="M3 3v16a2 2 0 0 0 2 2h16" />
        <path d="M18 17V9" />
        <path d="M13 17V5" />
        <path d="M8 17v-3" />
      </svg>
    ),
    addons: (
      <svg viewBox="0 0 24 24">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    marmitas: (
      <svg viewBox="0 0 24 24">
        <rect x="4" y="7" width="16" height="12" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="4" y1="12" x2="20" y2="12" />
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
  openStatus = { aberta: true, fechadaManual: false, abertaPorHorario: true },
  collapsed = false,
  compactViewport = false,
  newOrdersCount = 0,
  storeToggleBusy = false,
  storeToggleError = '',
  onCloseNow,
  onReopen,
  onToggleCollapse,
}) {
  const { aberta, fechadaManual } = openStatus;
  const pathname = usePathname();
  const { data } = useAdminData();
  const [superAdmin, setSuperAdmin] = useState(false);
  const [caixaManageModal, setCaixaManageModal] = useState(false);
  const toast = useAdminToast();
  const [supportUrl, setSupportUrl] = useState(NIMBUS_SUPPORT_URL);

  const navItems = useMemo(() => {
    const items = [...BASE_NAV];
    const produtosIndex = items.findIndex((item) => item.href === '/admin/produtos');
    if (isPizzariaSegment(data?.loja?.segmento)) {
      items.splice(produtosIndex, 0, {
        href: '/admin/pizzas',
        label: 'Pizzas',
        icon: 'pizzas',
      });
    }
    if (isMarmitaSegment(data?.loja?.segmento)) {
      const insertAt = items.findIndex((item) => item.href === '/admin/produtos');
      items.splice(insertAt, 0, {
        href: '/admin/marmitas',
        label: 'Marmitas',
        icon: 'marmitas',
      });
    }
    return items;
  }, [data?.loja?.segmento]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/nimbus-support')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload?.url) setSupportUrl(payload.url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/super-admin/me')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled) setSuperAdmin(Boolean(payload?.superAdmin));
      })
      .catch(() => {
        if (!cancelled) setSuperAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleStoreToggle(event) {
    if (storeToggleBusy) {
      event.preventDefault();
      return;
    }
    if (event.target.checked) onReopen?.();
    else onCloseNow?.();
  }

  const toggleTitle = fechadaManual
    ? 'Fechada manualmente. Ative para reabrir.'
    : aberta
      ? 'Loja aberta. Desative para fechar agora.'
      : 'Fechada pelo horário. Ative para liberar manualmente.';
  const cardapioHref = storeSlug ? getStorePublicUrl(storeSlug) : '';
  const showStoreName = !collapsed && !compactViewport;

  const logoNode = logoUrl ? (
    <img src={logoUrl} alt="Logo da loja" />
  ) : (
    'N'
  );

  return (
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}${compactViewport ? ' is-compact-viewport' : ''}`}>
      <div className="admin-sidebar-header">
        <div className="admin-store-badge">
          {cardapioHref ? (
            <a
              href={cardapioHref}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-store-avatar admin-store-avatar-link"
              title="Abrir cardápio público"
            >
              {logoNode}
            </a>
          ) : (
            <div className="admin-store-avatar">{logoNode}</div>
          )}
          {showStoreName ? (
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
                <span className="admin-store-cardapio-hint">Clique no nome para acessar o cardápio.</span>
              ) : null}
            </div>
          ) : null}
        </div>
        <AdminStoreSwitcher collapsed={collapsed} />
        <div
          className={`admin-toggle-row admin-store-toggle-compact${compactViewport ? ' is-label-hidden' : ''}`}
          title={toggleTitle}
        >
          <span className={`admin-store-toggle-label ${aberta ? 'open' : 'closed'}`}>
            {aberta ? 'Aberta' : 'Fechada'}
          </span>
          <label className="admin-switch admin-store-toggle-switch">
            <input
              type="checkbox"
              checked={aberta}
              disabled={storeToggleBusy}
              onChange={handleStoreToggle}
              aria-label={aberta ? 'Loja aberta' : 'Loja fechada'}
            />
            <span className="admin-switch-slider" />
          </label>
        </div>
        {storeToggleError && !collapsed ? (
          <p className="admin-store-open-error" role="alert">
            {storeToggleError}
          </p>
        ) : null}
        <CaixaSidebarStatus
          collapsed={collapsed}
          compact={compactViewport && !collapsed}
          onManageClick={() => setCaixaManageModal(true)}
        />
        <CaixaManageModal
          open={caixaManageModal}
          onClose={() => setCaixaManageModal(false)}
          onSuccess={(error, message) => {
            if (error instanceof Error) toast.error(error.message);
            else if (message) toast.success(message);
          }}
        />
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
        {navItems.map((item) => (
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
        <div className="admin-sidebar-footer-row">
          {superAdmin ? (
            <Link
              href="/admin/sistema"
              className={`admin-sidebar-sistema-link${pathname.startsWith('/admin/sistema') ? ' is-current' : ''}`}
              title={collapsed ? 'Sistema Nimbus' : undefined}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              <span>Sistema</span>
            </Link>
          ) : (
            <span className="admin-sidebar-footer-spacer" aria-hidden="true" />
          )}
          <div className="admin-sidebar-footer-actions">
            <a
              className="admin-sidebar-support-icon-btn"
              href={supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={NIMBUS_SUPPORT_LABEL}
              aria-label={NIMBUS_SUPPORT_LABEL}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M9.5 9.25a2.5 2.5 0 0 1 4.8 1c0 1.5-2.3 1.75-2.3 3.25M12 16.5h.01"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </a>
            <AdminLogoutButton variant="minimal" />
          </div>
        </div>
      </div>
    </aside>
  );
}
