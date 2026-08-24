import LandingJsonLd from '@/components/landing/LandingJsonLd';
import LandingPage from '@/components/landing/LandingPage';
import LandingSsrSplash from '@/components/landing/LandingSsrSplash';
import { HERO_DEMO_IMAGES } from '@/lib/landing/heroDemo';
import { getLandingJsonLd } from '@/lib/landing/seo';

export default function LandingHomeContent() {
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
