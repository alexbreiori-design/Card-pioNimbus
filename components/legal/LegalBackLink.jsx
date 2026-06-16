'use client';

import { useRouter, useSearchParams } from 'next/navigation';

function resolveFallback(searchParams, fallback = '/') {
  const from = searchParams.get('from');
  if (from && from.startsWith('/') && !from.startsWith('//')) {
    return from;
  }
  return fallback;
}

export default function LegalBackLink({ className, children = '← Voltar', fallback = '/' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fallbackHref = resolveFallback(searchParams, fallback);

  function handleClick(event) {
    event.preventDefault();
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <a href={fallbackHref} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
