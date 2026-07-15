import PublicRouteClient from '@/components/delivery/PublicRouteClient';
import '@/styles/public-route.css';

export const metadata = {
  title: 'Rota de entrega',
  robots: { index: false, follow: false },
};

export default async function PublicRoutePage({ params }) {
  const { token } = await params;
  return (
    <main className="public-route-page">
      <PublicRouteClient token={token} />
    </main>
  );
}
