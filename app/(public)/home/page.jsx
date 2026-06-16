import { redirect } from 'next/navigation';
import LandingPage from '@/components/landing/LandingPage';
import { getAuthenticatedUser } from '@/lib/supabase/membership';
import { isSuperAdminEmail } from '@/lib/superAdmin';
import { getSiteOrigin } from '@/lib/siteUrl';
import '@/styles/landing.css';

export const metadata = {
  title: 'Nimbus | Cardápio digital',
  description:
    'A Nimbus é a plataforma de cardápio digital com tudo incluso por R$ 149,90/mês. Ativação em 48h, suporte humano e ferramentas feitas para quem vive de delivery.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Cardápio Nimbus',
    description:
      'Cardápio digital completo, preço justo e suporte humano. Tudo incluso em um único plano.',
    url: `${getSiteOrigin()}/home`,
    type: 'website',
    locale: 'pt_BR',
  },
};

export default async function HomeMarketingPage() {
  const user = await getAuthenticatedUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    redirect('/');
  }

  return <LandingPage />;
}
