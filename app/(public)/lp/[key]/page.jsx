import { redirect } from 'next/navigation';
import LandingPage from '@/components/landing/LandingPage';
import { isValidLandingShareKey } from '@/lib/landing/shareAccess';
import { getSiteOrigin } from '@/lib/siteUrl';
import '@/styles/landing.css';
import '@phosphor-icons/web/fill/style.css';

export const metadata = {
  title: 'Nimbus | Cardápio digital',
  description:
    'A Nimbus é a plataforma de cardápio digital com tudo incluso por R$ 149,90/mês. Ativação em 48h, suporte humano e ferramentas feitas para quem vive de delivery.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Cardápio Nimbus',
    description:
      'Cardápio digital completo, preço justo e suporte humano. Tudo incluso em um único plano.',
    url: `${getSiteOrigin()}/lp`,
    type: 'website',
    locale: 'pt_BR',
  },
};

export default async function LandingSharePage({ params }) {
  const { key } = await params;

  if (!isValidLandingShareKey(key)) {
    redirect('/');
  }

  return <LandingPage />;
}
