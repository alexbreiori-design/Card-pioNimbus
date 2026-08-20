import LandingJsonLd from '@/components/landing/LandingJsonLd';
import LandingPage from '@/components/landing/LandingPage';
import { getLandingJsonLd, getLandingMetadata } from '@/lib/landing/seo';
import '@/styles/landing.css';
import '@phosphor-icons/web/fill/style.css';

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
      <LandingPage />
    </>
  );
}
