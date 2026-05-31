import { redirect } from 'next/navigation';
import '@/styles/admin.css';
import { createClient } from '@/lib/supabase/server';
import AdminProviders from './AdminProviders';

export const metadata = {
  title: 'Admin — Nimbus Cardápio',
  description: 'Painel administrativo do cardápio digital',
};

export default async function AdminRootLayout({ children }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    redirect('/login?error=config');
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login?redirect=/admin/pedidos');
  }

  return (
    <div className="admin-root">
      <AdminProviders>{children}</AdminProviders>
    </div>
  );
}
