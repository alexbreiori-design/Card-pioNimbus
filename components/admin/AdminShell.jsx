'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminSidebar from './AdminSidebar';
import { useAdminData } from '@/hooks/useAdminData';

export default function AdminShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { data, saveData, saving, saveError, clearSaveError, refreshFromRemote } = useAdminData();
  const store = useMemo(() => data.loja, [data]);
  const newOrdersCount = useMemo(
    () => (data.pedidos || []).filter((order) => order.status === 'novo' && !order.arquivado).length,
    [data.pedidos]
  );

  useEffect(() => {
    const refresh = () => {
      refreshFromRemote().catch(() => {});
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [refreshFromRemote]);

  return (
    <div className="admin-shell">
      {saveError ? (
        <div className="admin-sync-banner admin-sync-banner-error">
          <span>{saveError}</span>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={clearSaveError}>
            Fechar
          </button>
        </div>
      ) : null}
      {saving ? <div className="admin-sync-banner admin-sync-banner-saving">Salvando alterações…</div> : null}
      <AdminSidebar
        storeName={store.nome}
        logoUrl={store.logoUrl}
        isOpen={store.aberta}
        collapsed={collapsed}
        newOrdersCount={newOrdersCount}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onToggleOpen={(open) =>
          saveData((prev) => ({ ...prev, loja: { ...prev.loja, aberta: open } }))
        }
      />
      <div className={`admin-main ${collapsed ? 'sidebar-collapsed' : ''}`}>{children}</div>
    </div>
  );
}
