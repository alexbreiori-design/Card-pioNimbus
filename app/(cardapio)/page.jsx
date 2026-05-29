import { CardapioProvider } from '@/context/CardapioContext';
import CardapioApp from '@/components/cardapio/CardapioApp';

export default function HomePage() {
  return (
    <CardapioProvider>
      <CardapioApp />
    </CardapioProvider>
  );
}
