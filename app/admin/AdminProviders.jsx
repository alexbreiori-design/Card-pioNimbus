'use client';

import { AdminDataProvider } from '@/context/AdminDataContext';
import AdminShell from '@/components/admin/AdminShell';

export default function AdminProviders({ children }) {
  return (
    <AdminDataProvider>
      <AdminShell>{children}</AdminShell>
    </AdminDataProvider>
  );
}
