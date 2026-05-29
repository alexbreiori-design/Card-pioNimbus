'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackMetaPageView } from '@/lib/meta/pixel';

export default function MetaPixel({ pixelId }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pixelId) return;

    if (typeof window.fbq === 'function') return;

    const scriptId = 'meta-pixel-script';
    if (document.getElementById(scriptId)) return;

    const init = document.createElement('script');
    init.id = scriptId;
    init.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
    `;
    document.head.appendChild(init);
  }, [pixelId]);

  useEffect(() => {
    if (!pixelId || typeof window.fbq === 'undefined') return;
    trackMetaPageView();
  }, [pathname, pixelId]);

  if (!pixelId) return null;

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
