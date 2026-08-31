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
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap"
      />
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
