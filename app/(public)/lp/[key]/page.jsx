import { redirect } from 'next/navigation';
import LandingJsonLd from '@/components/landing/LandingJsonLd';
import LandingPage from '@/components/landing/LandingPage';
import { isValidLandingShareKey } from '@/lib/landing/shareAccess';
import { getLandingJsonLd, getLandingMetadata } from '@/lib/landing/seo';
import '@/styles/landing.css';
import '@phosphor-icons/web/fill/style.css';

export const metadata = {
  ...getLandingMetadata({ canonicalPath: '/' }),
  robots: { index: false, follow: false },
};

export default async function LandingSharePage({ params }) {
  const { key } = await params;

  if (!isValidLandingShareKey(key)) {
    redirect('/');
  }

  return (
    <>
      <LandingJsonLd data={getLandingJsonLd()} />
      <LandingPage />
    </>
  );
}
