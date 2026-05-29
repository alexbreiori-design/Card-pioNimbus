import { CardapioProvider } from '@/context/CardapioContext';
import CardapioApp from '@/components/cardapio/CardapioApp';

export default function LojaPublicaPage({ params }) {
  const slug = params?.slug || '';
  return (
    <CardapioProvider slug={slug}>
      <CardapioApp />
    </CardapioProvider>
  );
}
