import LandingJsonLd from '@/components/landing/LandingJsonLd';
import LandingPage from '@/components/landing/LandingPage';
import LandingSsrSplash from '@/components/landing/LandingSsrSplash';
import { getLandingJsonLd, getLandingMetadata } from '@/lib/landing/seo';
import '@/styles/landing-critical.css';

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
      <LandingJsonLd data={getLandingJsonLd()} />
      <LandingSsrSplash />
      <LandingPage />
    </>
  );
}
