'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminSidebar from './AdminSidebar';
import { useAdminData } from '@/hooks/useAdminData';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import { isStoreOpenBySchedule } from '@/lib/storeHours';

export default function AdminShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const { data, saving, saveError, clearSaveError, switchingStore } = useAdminData();
  const { orders } = useAdminOrders();
  const store = useMemo(() => data.loja, [data]);
  const isOpen = useMemo(
    () => isStoreOpenBySchedule(store.horarios, now),
    [store.horarios, now]
  );
  const newOrdersCount = useMemo(
    () => orders.filter((order) => order.status === 'novo' && !order.arquivado).length,
    [orders]
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="admin-shell">
      <AdminSidebar
        storeName={store.nome}
        storeSlug={store.slug}
        logoUrl={store.logoUrl}
        isOpen={isOpen}
        collapsed={collapsed}
        newOrdersCount={newOrdersCount}
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
