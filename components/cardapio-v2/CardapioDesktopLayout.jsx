'use client';

import CardapioSidebar from './CardapioSidebar';
import CardapioMainColumn from './CardapioMainColumn';
import CardapioCartColumn from './CardapioCartColumn';

export default function CardapioDesktopLayout() {
  return (
    <div className="cardapio-v2-layout">
      <CardapioSidebar />
      <CardapioMainColumn />
      <CardapioCartColumn />
    </div>
  );
}
