import LandingHomeContent from '@/components/landing/LandingHomeContent';
import { getLandingMetadata } from '@/lib/landing/seo';
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
  return <LandingHomeContent />;
}
