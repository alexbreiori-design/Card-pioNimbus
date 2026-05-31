'use client';

import Image from 'next/image';

export default function CardapioSplash({ visible }) {
  if (!visible) return null;

  return (
    <div className="cardapio-splash" aria-hidden="true">
      <Image
        className="cardapio-splash-icon"
        src="/images/icon.png"
        alt=""
        width={88}
        height={88}
        priority
      />
    </div>
  );
}
