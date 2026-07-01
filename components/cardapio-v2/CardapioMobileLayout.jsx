'use client';

import MobileSacolaBar from '@/components/cardapio/MobileSacolaBar';

/** Chrome mobile do v2 (viewport abaixo de 1100px): barra fixa da sacola. Conteúdo em CardapioDesktopLayout via CSS. */
export default function CardapioMobileLayout() {
  return <MobileSacolaBar />;
}
