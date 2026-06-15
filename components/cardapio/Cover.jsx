'use client';

import { useCardapio } from '@/context/CardapioContext';
import MenuImageArea from '@/components/cardapio/MenuImageArea';

export default function Cover() {
  const { storeConfig } = useCardapio();
  const hasCover = Boolean(storeConfig.capaUrl);

  return (
    <MenuImageArea
      imageUrl={storeConfig.capaUrl}
      className={`cover-placeholder ${hasCover ? '' : 'no-image'}`}
      placeholderClass="no-image"
      alt="Capa da loja"
      sizes="100vw"
    />
  );
}
