'use client';

import Image from 'next/image';
import AdminLogoutButton from '@/components/admin/AdminLogoutButton';
import SuperAdminNavIcon from './SuperAdminNavIcon';
import { SUPER_ADMIN_LOGO } from '@/lib/superAdminIcons';
import { getConfiguredDefaultSlug } from '@/lib/storeBoot';

const MAIN_NAV = [
  { id: 'inicio', label: 'Início', icon: 'home' },
  { id: 'lojas', label: 'Lojas', icon: 'stores' },
  { id: 'relatorios', label: 'Relatórios', icon: 'reports' },
  { id: 'configuracoes', label: 'Configurações', icon: 'configuracoes' },
];

export default function SuperAdminShell({
  children,
  activeView = 'inicio',
  onViewChange,
  collapsed = false,
  onToggleCollapse,
}) {
  const modelSlug = getConfiguredDefaultSlug();

  return (
    <div className="admin-shell admin-sistema-shell">
      <aside className={`admin-sidebar admin-sistema-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="admin-sidebar-header admin-sistema-sidebar-header">
          <div className="admin-sistema-logo-wrap">
            <Image
              src={SUPER_ADMIN_LOGO}
              alt="Nimbus"
              width={collapsed ? 52 : 140}
              height={collapsed ? 44 : 118}
              className="admin-sistema-logo"
              priority
              unoptimized
            />
          </div>
          <button
            type="button"
            className="admin-sidebar-collapse-btn admin-sistema-collapse-btn"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={collapsed ? 'M9 7l6 5-6 5' : 'M15 7l-6 5 6 5'} />
            </svg>
          </button>
        </div>

        <nav className="admin-nav admin-sistema-nav" aria-label="Navegação do sistema">
          {MAIN_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-nav-item admin-sistema-nav-item${activeView === item.id ? ' active' : ''}`}
              onClick={() => onViewChange?.(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <SuperAdminNavIcon name={item.icon} />
              <span className="admin-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer admin-sistema-sidebar-footer">
          <div className="admin-sidebar-footer-row">
            {modelSlug ? (
              <a
                href="/admin/pedidos"
                className="admin-sistema-model-link-btn"
                title={collapsed ? 'Loja modelo' : undefined}
              >
                <SuperAdminNavIcon name="model" />
                <span>Loja modelo</span>
              </a>
            ) : (
              <span className="admin-sidebar-footer-spacer" aria-hidden="true" />
            )}
            <div className="admin-sidebar-footer-actions">
              <AdminLogoutButton variant="minimal" />
            </div>
          </div>
        </div>
      </aside>

      <div className={`admin-main admin-sistema-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {children}
      </div>
    </div>
  );
}
