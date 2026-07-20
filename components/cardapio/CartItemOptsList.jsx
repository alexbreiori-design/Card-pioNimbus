import { getCartObsLabels } from '@/lib/cardapio/formatCartOpts';

export default function CartItemOptsList({
  opts,
  obs,
  note,
  className = '',
  itemClassName = '',
  as: Tag = 'ul',
}) {
  const labels = getCartObsLabels({ opts, obs, note });
  if (!labels.length) return null;

  const listClass = `cart-item-opts-list${className ? ` ${className}` : ''}`;
  const rowClass = `cart-item-opts-list__item${itemClassName ? ` ${itemClassName}` : ''}`;

  return (
    <Tag className={listClass}>
      {labels.map((label, index) => (
        <li key={`${label}-${index}`} className={rowClass}>
          {label}
        </li>
      ))}
    </Tag>
  );
}
