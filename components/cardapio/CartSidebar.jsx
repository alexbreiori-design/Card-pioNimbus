'use client';

import { useCardapio } from '@/context/CardapioContext';
import SacolaPanel from './SacolaPanel';

export default function CartSidebar() {
  const { openCheckout } = useCardapio();

  return (
    <div className="sidebar-col">
      <div className="sidebar-card">
        <SacolaPanel onFinalize={openCheckout} finalizeLabel="Finalizar pedido" />
      </div>
    </div>
  );
}
