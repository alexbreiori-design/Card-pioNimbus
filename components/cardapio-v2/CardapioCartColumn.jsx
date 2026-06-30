'use client';

import SacolaPanel from '@/components/cardapio/SacolaPanel';
import { useCardapio } from '@/context/CardapioContext';
import { V2Icon } from './CardapioV2Icons';

export default function CardapioCartColumn() {
  const { openCheckout } = useCardapio();

  return (
    <aside className="cardapio-v2-cart cardapio-theme-root" aria-label="Meu pedido">
      <div className="cardapio-v2-cart-card">
        <header className="cardapio-v2-cart-head">
          <h2 className="cardapio-v2-cart-title">
            <V2Icon name="shopping-cart" className="cardapio-v2-cart-title-icon" />
            Meu pedido
          </h2>
        </header>
        <div className="cardapio-v2-cart-body">
          <SacolaPanel
            onFinalize={openCheckout}
            finalizeLabel="Finalizar pedido"
            orderTerminology
            promoCupomIcon
            cartEmptyIcon
            inlineQtyControls
          />
        </div>
      </div>
    </aside>
  );
}
