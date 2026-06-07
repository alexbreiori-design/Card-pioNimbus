import './globals.css';
import { readFileSync } from 'fs';
import { join } from 'path';
import SupabaseConfigProvider from '@/components/SupabaseConfigProvider';
import { getSupabasePublicEnv } from '@/lib/supabase/publicEnv';

export const dynamic = 'force-dynamic';

function getCardapioCss() {
  try {
    return readFileSync(join(process.cwd(), 'styles/cardapio.css'), 'utf8');
  } catch {
    return '';
  }
}

const cardapioCss = getCardapioCss();

export const metadata = {
  title: 'Cardápio Digital',
  description: 'Cardápio digital para restaurantes',
};

export default function RootLayout({ children }) {
  const supabase = getSupabasePublicEnv();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {cardapioCss ? (
          <style dangerouslySetInnerHTML={{ __html: cardapioCss }} />
        ) : null}
      </head>
      <body>
        <SupabaseConfigProvider url={supabase.url} anonKey={supabase.anonKey}>
          {children}
        </SupabaseConfigProvider>
      </body>
    </html>
  );
}
