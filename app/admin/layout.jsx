import '@/styles/admin.css';
import AdminProviders from './AdminProviders';

export const metadata = {
  title: 'Admin — Nimbus Cardápio',
  description: 'Painel administrativo do cardápio digital',
};

export default function AdminRootLayout({ children }) {
  return (
    <div className="admin-root">
      <AdminProviders>{children}</AdminProviders>
    </div>
  );
}
