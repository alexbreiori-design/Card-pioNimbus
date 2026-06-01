import Link from 'next/link';

export default function LojaNotFound() {
  return (
    <main className="slug-not-found">
      <div className="slug-not-found-card">
        <h1>Loja não encontrada</h1>
        <p>O endereço que você acessou não corresponde a nenhum cardápio ativo.</p>
        <Link href="/">Voltar ao início</Link>
      </div>
    </main>
  );
}
