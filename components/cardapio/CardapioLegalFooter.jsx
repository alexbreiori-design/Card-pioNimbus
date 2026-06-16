'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

function useLegalFrom() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const path = query ? `${pathname}?${query}` : pathname;
  return encodeURIComponent(path || '/');
}

export default function CardapioLegalFooter() {
  const from = useLegalFrom();

  return (
    <footer className="cardapio-legal-footer" aria-label="Informações legais">
      <Link href={`/privacidade?from=${from}`}>Privacidade</Link>
      <span aria-hidden="true">·</span>
      <Link href={`/termos?from=${from}`}>Termos</Link>
    </footer>
  );
}
