'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import AdminLogoutButton from '@/components/admin/AdminLogoutButton';
import { ADMIN_MOBILE_NAV } from '@/lib/admin/mobileAccess';

function DrawerNavIcon({ name }) {
  if (name === 'store') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
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
  const { aberta, fechadaManual } = openStatus;

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

        <nav className="admin-mobile-drawer-nav" aria-label="Funções mobile">
          {ADMIN_MOBILE_NAV.map((item) => (
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

        <p className="admin-mobile-drawer-desktop-note">
          Para acessar pedidos, produtos, cupons e demais funções, use o painel pelo computador.
        </p>

        <div className="admin-mobile-drawer-footer">
          <AdminLogoutButton variant="full" />
        </div>
      </aside>
    </>
  );
}
