import Script from 'next/script';
import { redirect } from 'next/navigation';
import '@phosphor-icons/web/regular/style.css';
import '@phosphor-icons/web/fill/style.css';
import '@phosphor-icons/web/bold/style.css';
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
      <Script
        type="module"
        src="https://cdn.jsdelivr.net/npm/ionicons@7.4.0/dist/ionicons/ionicons.esm.js"
        strategy="afterInteractive"
      />
      <Script
        noModule
        src="https://cdn.jsdelivr.net/npm/ionicons@7.4.0/dist/ionicons/ionicons.js"
        strategy="afterInteractive"
      />
      <AdminProviders>{children}</AdminProviders>
    </div>
  );
}
