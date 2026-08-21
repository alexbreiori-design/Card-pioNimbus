import { redirect } from 'next/navigation';
import LandingJsonLd from '@/components/landing/LandingJsonLd';
import LandingPage from '@/components/landing/LandingPage';
import LandingSsrSplash from '@/components/landing/LandingSsrSplash';
import { HERO_DEMO_IMAGES } from '@/lib/landing/heroDemo';
import { isValidLandingShareKey } from '@/lib/landing/shareAccess';
import { getLandingJsonLd, getLandingMetadata } from '@/lib/landing/seo';
import '@/styles/landing.css';

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
      <link
        rel="preload"
        as="image"
        href={HERO_DEMO_IMAGES.mobilePhone}
        type="image/webp"
        fetchPriority="high"
      />
      <LandingJsonLd data={getLandingJsonLd()} />
      <LandingSsrSplash />
      <LandingPage />
    </>
  );
}
