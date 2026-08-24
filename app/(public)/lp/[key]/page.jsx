import LandingHomeContent from '@/components/landing/LandingHomeContent';
import { getLandingMetadata } from '@/lib/landing/seo';
import '@/styles/landing.css';

export const revalidate = 86400;

export const metadata = {
  ...getLandingMetadata({ canonicalPath: '/' }),
  robots: { index: false, follow: false },
};

export default function LandingSharePage() {
  return <LandingHomeContent />;
}
