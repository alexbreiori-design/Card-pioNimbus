'use client';

import { usePathname } from 'next/navigation';
import { AdminDataProvider } from '@/context/AdminDataContext';
import { AdminOrdersProvider } from '@/context/AdminOrdersContext';
import { OrderPrintProvider } from '@/context/OrderPrintContext';
import AdminShell from '@/components/admin/AdminShell';
import AdminBootGate from '@/components/admin/AdminBootGate';

export default function AdminProviders({ children }) {
  const pathname = usePathname();
  const isSemAcesso = pathname === '/admin/sem-acesso';
  const isLojaSuspensa = pathname === '/admin/loja-suspensa';
  const isSistema = pathname === '/admin/sistema' || pathname.startsWith('/admin/sistema/');

  if (isSistema) {
    return <div className="admin-root admin-sistema-root">{children}</div>;
  }

  if (isSemAcesso || isLojaSuspensa) {
    return <div className="admin-root">{children}</div>;
  }

  return (
    <AdminDataProvider>
      <AdminOrdersProvider>
        <OrderPrintProvider>
          <AdminBootGate>
            <AdminShell>{children}</AdminShell>
          </AdminBootGate>
        </OrderPrintProvider>
      </AdminOrdersProvider>
    </AdminDataProvider>
  );
}
