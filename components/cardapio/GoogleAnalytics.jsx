'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  initGoogleAnalytics,
  sanitizeGa4MeasurementId,
  sanitizeGtmContainerId,
  trackGooglePageView,
} from '@/lib/analytics/googleTags';

export default function GoogleAnalytics({ ga4MeasurementId, gtmContainerId }) {
  const pathname = usePathname();
  const ga4Id = sanitizeGa4MeasurementId(ga4MeasurementId);
  const gtmId = sanitizeGtmContainerId(gtmContainerId);

  useEffect(() => {
    if (!ga4Id && !gtmId) return undefined;
    initGoogleAnalytics({ ga4MeasurementId: ga4Id, gtmContainerId: gtmId });
    trackGooglePageView(pathname);
    return undefined;
  }, [ga4Id, gtmId]);

  useEffect(() => {
    if (!ga4Id && !gtmId) return undefined;
    trackGooglePageView(pathname);
    return undefined;
  }, [pathname, ga4Id, gtmId]);

  if (!gtmId) return null;

  return (
    <noscript>
      <iframe
        title="Google Tag Manager"
        src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtmId)}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}
