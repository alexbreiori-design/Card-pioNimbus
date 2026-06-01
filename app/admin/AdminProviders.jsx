'use client';

import { usePathname } from 'next/navigation';
import { AdminDataProvider } from '@/context/AdminDataContext';
import { AdminOrdersProvider } from '@/context/AdminOrdersContext';
import AdminShell from '@/components/admin/AdminShell';
import AdminBootGate from '@/components/admin/AdminBootGate';

export default function AdminProviders({ children }) {
  const pathname = usePathname();
  const isSemAcesso = pathname === '/admin/sem-acesso';

  if (isSemAcesso) {
    return <div className="admin-root">{children}</div>;
  }

  return (
    <AdminDataProvider>
      <AdminOrdersProvider>
        <AdminBootGate>
          <AdminShell>{children}</AdminShell>
        </AdminBootGate>
      </AdminOrdersProvider>
    </AdminDataProvider>
  );
}
