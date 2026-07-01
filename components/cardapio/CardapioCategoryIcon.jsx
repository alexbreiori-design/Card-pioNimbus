'use client';

import CategoryIcon from '@/components/admin/CategoryIcon';
import PromoFireIcon from './PromoFireIcon';

export default function CardapioCategoryIcon({
  name = 'burger',
  size = 18,
  className = '',
  tinted = true,
}) {
  if (name === 'promo') {
    return <PromoFireIcon size={size} className={className} />;
  }

  return (
    <CategoryIcon name={name} size={size} className={className} tinted={tinted} />
  );
}
