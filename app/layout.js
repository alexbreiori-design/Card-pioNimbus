import './globals.css';
import SupabaseConfigProvider from '@/components/SupabaseConfigProvider';
import { getGoogleSiteVerification, LANDING_META } from '@/lib/landing/seo';
import { getSiteOrigin } from '@/lib/siteUrl';
import { getSupabasePublicEnv } from '@/lib/supabase/publicEnv';

export const metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: LANDING_META.title,
    template: '%s | Cardápio Nimbus',
  },
  description: LANDING_META.description,
  verification: {
    google: getGoogleSiteVerification(),
  },
};

export default function RootLayout({ children }) {
  const supabase = getSupabasePublicEnv();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <SupabaseConfigProvider url={supabase.url} anonKey={supabase.anonKey}>
          {children}
        </SupabaseConfigProvider>
      </body>
    </html>
  );
}
