import LandingJsonLd from '@/components/landing/LandingJsonLd';
import LandingPage from '@/components/landing/LandingPage';
import LandingSsrSplash from '@/components/landing/LandingSsrSplash';
import { HERO_DEMO_IMAGES } from '@/lib/landing/heroDemo';
import { getLandingJsonLd, getLandingMetadata } from '@/lib/landing/seo';
import '@/styles/landing.css';

/* Landing estática servida pelo CDN (antes vinha com no-store do layout raiz). */
export const revalidate = 86400;

export const metadata = {
  ...getLandingMetadata({ canonicalPath: '/' }),
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootPage() {
  return (
    <>
      {/* LCP do mobile: hero phone, não o logo do header */}
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
