import '@/styles/admin.css';
import AdminShell from '@/components/admin/AdminShell';

export const metadata = {
  title: 'Admin — Nimbus Cardápio',
  description: 'Painel administrativo do cardápio digital',
};

export default function AdminRootLayout({ children }) {
  return (
    <div className="admin-root">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
