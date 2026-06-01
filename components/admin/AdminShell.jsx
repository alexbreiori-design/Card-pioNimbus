'use client';

import { useMemo, useState } from 'react';
import AdminSidebar from './AdminSidebar';
import { useAdminData } from '@/hooks/useAdminData';
import { useAdminOrders } from '@/hooks/useAdminOrders';

export default function AdminShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { data, saveData, saving, saveError, clearSaveError, switchingStore } = useAdminData();
  const { orders } = useAdminOrders();
  const store = useMemo(() => data.loja, [data]);
  const newOrdersCount = useMemo(
    () => orders.filter((order) => order.status === 'novo' && !order.arquivado).length,
    [orders]
  );

  return (
    <div className="admin-shell">
      <AdminSidebar
        storeName={store.nome}
        storeSlug={store.slug}
        logoUrl={store.logoUrl}
        isOpen={store.aberta}
        collapsed={collapsed}
        newOrdersCount={newOrdersCount}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onToggleOpen={(open) =>
          saveData((prev) => ({ ...prev, loja: { ...prev.loja, aberta: open } }))
        }
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
