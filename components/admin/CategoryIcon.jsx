import { getCategoryIconPath } from '@/lib/categoryIcons';

export default function CategoryIcon({ name = 'burger', size = 20, className = '', tinted = false }) {
  const src = getCategoryIconPath(name);
  const classes = ['admin-category-icon', tinted ? 'admin-category-icon-tinted' : '', className]
    .filter(Boolean)
    .join(' ');

  if (tinted) {
    return (
      <span
        className={classes}
        style={{
          width: size,
          height: size,
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    />
  );
}
