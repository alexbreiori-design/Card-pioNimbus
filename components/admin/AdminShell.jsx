'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminSidebar from './AdminSidebar';
import { useAdminData } from '@/hooks/useAdminData';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import { persistStoreManualClose } from '@/lib/storeManualClose';
import { resolveStoreOpenStatus } from '@/lib/storeHours';

export default function AdminShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [storeToggleBusy, setStoreToggleBusy] = useState(false);
  const [storeToggleError, setStoreToggleError] = useState('');
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

  return (
    <div className="admin-shell">
      <AdminSidebar
        storeName={store.nome}
        storeSlug={store.slug}
        logoUrl={store.logoUrl}
        openStatus={openStatus}
        collapsed={collapsed}
        newOrdersCount={newOrdersCount}
        storeToggleBusy={storeToggleBusy || saving}
        storeToggleError={storeToggleError}
        onCloseNow={handleCloseNow}
        onReopen={handleReopen}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />
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
        {children}
      </div>
    </div>
  );
}
