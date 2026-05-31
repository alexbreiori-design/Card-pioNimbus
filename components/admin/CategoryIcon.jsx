import { getCategoryIconPath } from '@/lib/categoryIcons';

export default function CategoryIcon({ name = 'burger', size = 20, className = '' }) {
  return (
    <img
      src={getCategoryIconPath(name)}
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    />
  );
}
