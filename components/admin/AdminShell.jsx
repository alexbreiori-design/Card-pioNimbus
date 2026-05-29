'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import { useAdminData } from '@/hooks/useAdminData';

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';
  const [collapsed, setCollapsed] = useState(false);
  const { data, saveData } = useAdminData();
  const store = useMemo(() => data.loja, [data]);

  if (isLogin) {
    return children;
  }

  return (
    <div className="admin-shell">
      <AdminSidebar
        storeName={store.nome}
        logoUrl={store.logoUrl}
        isOpen={store.aberta}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onToggleOpen={(open) =>
          saveData((prev) => ({ ...prev, loja: { ...prev.loja, aberta: open } }))
        }
      />
      <div className={`admin-main ${collapsed ? 'sidebar-collapsed' : ''}`}>{children}</div>
    </div>
  );
}
