'use client';

import { useCardapio } from '@/context/CardapioContext';

export default function Cover() {
  const { storeConfig } = useCardapio();
  const hasCover = Boolean(storeConfig.capaUrl);

  return (
    <div
      className={`cover-placeholder ${hasCover ? '' : 'no-image'}`}
      style={
        hasCover
          ? {
              backgroundImage: `url(${storeConfig.capaUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    />
  );
}
