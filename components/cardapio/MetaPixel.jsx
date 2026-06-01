'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { sanitizeMetaPixelId, trackMetaPageView } from '@/lib/meta/pixel';

export default function MetaPixel({ pixelId }) {
  const pathname = usePathname();
  const safePixelId = useMemo(() => sanitizeMetaPixelId(pixelId), [pixelId]);

  useEffect(() => {
    if (!safePixelId) return;
    if (typeof window.fbq === 'function') return;

    const scriptId = 'meta-pixel-script';
    if (document.getElementById(scriptId)) return;

    const loader = document.createElement('script');
    loader.id = scriptId;
    loader.textContent = `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
`;
    document.head.appendChild(loader);

    const init = document.createElement('script');
    init.textContent = `fbq('init', '${safePixelId}');`;
    document.head.appendChild(init);
  }, [safePixelId]);

  useEffect(() => {
    if (!safePixelId || typeof window.fbq !== 'function') return;
    trackMetaPageView();
  }, [pathname, safePixelId]);

  if (!safePixelId) return null;

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${encodeURIComponent(safePixelId)}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
