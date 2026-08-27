'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import AdminIcon from '@/components/admin/AdminIcon';
import AdminLogoutButton from '@/components/admin/AdminLogoutButton';
import { CaixaStatusChip } from '@/components/admin/caixa/CaixaPanels';
import { useAdminData } from '@/hooks/useAdminData';
import {
  getAdminMobileDesktopNote,
  getAdminMobileNavItems,
} from '@/lib/admin/mobileAccess';

function DrawerNavIcon({ name }) {
  if (name === 'store') {
    return <AdminIcon name="store" />;
  }

  if (name === 'orders') {
    return <i className="ph ph-clipboard-text admin-mobile-drawer-ph" aria-hidden="true" />;
  }

  if (name === 'pizzas') {
    return <i className="ph ph-pizza admin-mobile-drawer-ph" aria-hidden="true" />;
  }

  if (name === 'products') {
    return <ion-icon name="fast-food-outline" aria-hidden="true" />;
  }

  if (name === 'promos') {
    return <i className="ph ph-seal-percent admin-mobile-drawer-ph" aria-hidden="true" />;
  }

  if (name === 'reviews') {
    return <i className="ph ph-star admin-mobile-drawer-ph" aria-hidden="true" />;
  }

  const icons = {
    reports: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3v16a2 2 0 0 0 2 2h16" />
        <path d="M18 17V9" />
        <path d="M13 17V5" />
        <path d="M8 17v-3" />
      </svg>
    ),
    addons: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    marmitas: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="7" width="16" height="12" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="4" y1="12" x2="20" y2="12" />
      </svg>
    ),
    coupons: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 5H3a2 2 0 0 0-2 2v3a2 2 0 0 1 0 4v3a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2v-3a2 2 0 0 1 0-4V7a2 2 0 0 0-2-2z" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="15" y1="9" x2="9" y2="15" />
      </svg>
    ),
    clients: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    ),
    delivery: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="10" r="3" />
        <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
      </svg>
    ),
    integrations: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  };

  return icons[name] || null;
}

export default function AdminMobileDrawer({
  open,
  onClose,
  storeName = 'Minha loja',
  logoUrl = '',
  openStatus = { aberta: true, fechadaManual: false },
  storeToggleBusy = false,
  storeToggleError = '',
  onCloseNow,
  onReopen,
}) {
  const pathname = usePathname();
  const { data } = useAdminData();
  const { aberta, fechadaManual } = openStatus;
  const navItems = useMemo(() => getAdminMobileNavItems(data?.loja), [data?.loja]);
  const desktopNote = getAdminMobileDesktopNote(data?.loja);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

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

  return (
    <>
      <button
        type="button"
        className={`admin-mobile-drawer-backdrop ${open ? 'open' : ''}`}
        aria-label="Fechar menu"
        onClick={onClose}
      />
      <aside
        className={`admin-mobile-drawer ${open ? 'open' : ''}`}
        aria-hidden={!open}
        aria-label="Menu do painel"
      >
        <div className="admin-mobile-drawer-head">
          <div className="admin-mobile-drawer-brand">
            <div className="admin-mobile-drawer-avatar">
              {logoUrl ? <img src={logoUrl} alt="" /> : 'N'}
            </div>
            <div>
              <p className="admin-mobile-drawer-eyebrow">Painel Nimbus</p>
              <h2>{storeName}</h2>
            </div>
          </div>
          <button
            type="button"
            className="admin-mobile-drawer-close"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            ×
          </button>
        </div>

        <div className="admin-mobile-drawer-toggle" title={toggleTitle}>
          <div>
            <span className={`admin-store-toggle-label ${aberta ? 'open' : 'closed'}`}>
              {aberta ? 'Loja aberta' : 'Loja fechada'}
            </span>
            <p className="admin-mobile-drawer-toggle-hint">
              {fechadaManual
                ? 'Fechada manualmente'
                : aberta
                  ? 'Aceitando pedidos agora'
                  : 'Fora do horário de funcionamento'}
            </p>
          </div>
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

        {storeToggleError ? (
          <p className="admin-mobile-drawer-error" role="alert">
            {storeToggleError}
          </p>
        ) : null}

        <div className="admin-mobile-drawer-caixa">
          <CaixaStatusChip />
        </div>

        <nav className="admin-mobile-drawer-nav" aria-label="Funções mobile">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-mobile-drawer-link ${
                pathname.startsWith(item.href) ? 'active' : ''
              }`}
              onClick={onClose}
            >
              <DrawerNavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {desktopNote ? <p className="admin-mobile-drawer-desktop-note">{desktopNote}</p> : null}

        <div className="admin-mobile-drawer-footer">
          <AdminLogoutButton variant="full" />
        </div>
      </aside>
    </>
  );
}
