'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminMobileDrawer from './AdminMobileDrawer';
import AdminMobileGate from './AdminMobileGate';
import { useAdminData } from '@/hooks/useAdminData';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import { useAdminMobileAccess } from '@/hooks/useAdminMobileAccess';
import { persistStoreManualClose } from '@/lib/storeManualClose';
import { resolveStoreOpenStatus } from '@/lib/storeHours';

export default function AdminShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [compactViewport, setCompactViewport] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [storeToggleBusy, setStoreToggleBusy] = useState(false);
  const [storeToggleError, setStoreToggleError] = useState('');
  const isMobile = useAdminMobileAccess();
  const { data, saving, saveError, clearSaveError, switchingStore, saveData, activeSlug } =
    useAdminData();
  const { orders, setAlertsActive } = useAdminOrders();
  const store = useMemo(() => data.loja, [data]);
  const openStatus = useMemo(
    () => resolveStoreOpenStatus(store, now),
    [store, now]
  );
  const newOrdersCount = useMemo(
    () => orders.filter((order) => order.status === 'novo' && !order.arquivado).length,
    [orders]
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setAlertsActive(true);
    return () => setAlertsActive(false);
  }, [setAlertsActive]);

  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  const handleCloseNow = useCallback(async () => {
    setStoreToggleError('');
    setStoreToggleBusy(true);
    try {
      await persistStoreManualClose({
        saveData,
        slug: activeSlug || store.slug,
        fechadaManual: true,
        loja: store,
      });
    } catch (error) {
      setStoreToggleError(error?.message || 'Não foi possível fechar a loja.');
    } finally {
      setStoreToggleBusy(false);
    }
  }, [activeSlug, saveData, store]);

  const handleReopen = useCallback(async () => {
    setStoreToggleError('');
    setStoreToggleBusy(true);
    try {
      await persistStoreManualClose({
        saveData,
        slug: activeSlug || store.slug,
        fechadaManual: false,
        loja: store,
      });
    } catch (error) {
      setStoreToggleError(error?.message || 'Não foi possível reabrir a loja.');
    } finally {
      setStoreToggleBusy(false);
    }
  }, [activeSlug, saveData, store]);

  useEffect(() => {
    if (isMobile) return undefined;
    const mq = window.matchMedia('(max-width: 1366px)');
    const apply = () => {
      setCompactViewport(mq.matches);
      setCollapsed(mq.matches);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [isMobile]);

  const shellClassName = `admin-shell${isMobile ? ' admin-shell-mobile' : ''}${compactViewport ? ' admin-viewport-compact' : ''}`;

  return (
    <div className={shellClassName}>
      {!isMobile ? (
        <AdminSidebar
          storeName={store.nome}
          storeSlug={store.slug}
          logoUrl={store.logoUrl}
          openStatus={openStatus}
          collapsed={collapsed}
          compactViewport={compactViewport}
          newOrdersCount={newOrdersCount}
          storeToggleBusy={storeToggleBusy || saving}
          storeToggleError={storeToggleError}
          onCloseNow={handleCloseNow}
          onReopen={handleReopen}
          onToggleCollapse={() => setCollapsed((v) => !v)}
        />
      ) : (
        <>
          <button
            type="button"
            className="admin-mobile-menu-fab"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={drawerOpen}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          </button>
          <AdminMobileDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            storeName={store.nome}
            logoUrl={store.logoUrl}
            openStatus={openStatus}
            storeToggleBusy={storeToggleBusy || saving}
            storeToggleError={storeToggleError}
            onCloseNow={handleCloseNow}
            onReopen={handleReopen}
          />
        </>
      )}
      <div className={`admin-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {switchingStore ? (
          <div className="admin-sync-banner admin-sync-banner-saving">Trocando de loja…</div>
        ) : null}
        {saveError ? (
          <div className="admin-sync-banner admin-sync-banner-error">
            <span>{saveError}</span>
            <button type="button" className="admin-btn admin-btn-ghost" onClick={clearSaveError}>
              Fechar
            </button>
          </div>
        ) : null}
        {saving ? (
          <div className="admin-sync-banner admin-sync-banner-saving">Salvando alterações…</div>
        ) : null}
        <AdminMobileGate>{children}</AdminMobileGate>
      </div>
    </div>
  );
}
