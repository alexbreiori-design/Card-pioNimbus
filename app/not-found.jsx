import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="slug-not-found">
      <div className="slug-not-found-card">
        <h1>Página não encontrada</h1>
        <p>O endereço que você acessou não está disponível.</p>
        <Link href="/">Voltar ao início</Link>
      </div>
    </main>
  );
}
