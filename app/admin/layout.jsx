import Script from 'next/script';
import { redirect } from 'next/navigation';
import '@phosphor-icons/web/regular/style.css';
import '@phosphor-icons/web/fill/style.css';
import '@phosphor-icons/web/bold/style.css';
import '@/styles/admin.css';
import '@/styles/category-icons.css';
import AdminProviders from './AdminProviders';

/* Sessão validada no proxy; layout só monta o shell do admin. */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Adm - Cardápio Nimbus',
  description: 'Painel administrativo do cardápio digital',
};

export default function AdminRootLayout({ children }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    redirect('/login?error=config');
  }

  return (
    <div className="admin-root">
      <link rel="stylesheet" href="https://cdn.hugeicons.com/font/hgi-stroke-rounded.css" />
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
