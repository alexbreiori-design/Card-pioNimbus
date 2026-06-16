import UnderConstructionPage from '@/components/landing/UnderConstructionPage';
import { getSiteOrigin } from '@/lib/siteUrl';

export const metadata = {
  title: 'Nimbus | Em breve',
  description:
    'Cardápio digital para delivery. Estamos preparando nossa nova página — lojistas já podem acessar o painel.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Nimbus — Em breve',
    description: 'Cardápio digital para delivery.',
    url: getSiteOrigin(),
    type: 'website',
    locale: 'pt_BR',
  },
};

export default function RootPage() {
  return <UnderConstructionPage />;
};
