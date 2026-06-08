import LandingPage from '@/components/landing/LandingPage';
import { getSiteOrigin } from '@/lib/siteUrl';
import '@/styles/landing.css';

export const metadata = {
  title: 'Cardápio Nimbus | Cardápio digital para restaurantes e delivery',
  description:
    'A Nimbus é a plataforma de cardápio digital com tudo incluso por R$ 149,90/mês. Ativação em 48h, suporte humano e ferramentas feitas para quem vive de delivery.',
  openGraph: {
    title: 'Cardápio Nimbus',
    description:
      'Cardápio digital completo, preço justo e suporte humano. Tudo incluso em um único plano.',
    url: getSiteOrigin(),
    type: 'website',
    locale: 'pt_BR',
  },
};

export default function HomeMarketingPage() {
  return <LandingPage />;
}
