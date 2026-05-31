import { CardapioProvider } from '@/context/CardapioContext';
import CardapioApp from '@/components/cardapio/CardapioApp';
import { getConfiguredDefaultSlug } from '@/lib/storeBoot';

export default function HomePage() {
  return (
    <CardapioProvider slug={getConfiguredDefaultSlug()}>
      <CardapioApp />
    </CardapioProvider>
  );
}
