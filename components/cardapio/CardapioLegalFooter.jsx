import Link from 'next/link';

export default function CardapioLegalFooter() {
  return (
    <footer className="cardapio-legal-footer" aria-label="Informações legais">
      <Link href="/privacidade">Privacidade</Link>
      <span aria-hidden="true">·</span>
      <Link href="/termos">Termos</Link>
    </footer>
  );
}
