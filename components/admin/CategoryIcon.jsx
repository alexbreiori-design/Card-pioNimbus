'use client';

import { useEffect, useState } from 'react';
import { FALLBACK_ICON_ID, getCategoryIconPath } from '@/lib/categoryIcons';
import '@/styles/category-icons.css';

export default function CategoryIcon({
  name = FALLBACK_ICON_ID,
  size = 20,
  className = '',
  tinted = false,
}) {
  const [failed, setFailed] = useState(false);
  const iconName = failed ? FALLBACK_ICON_ID : name;
  const src = getCategoryIconPath(iconName);

  useEffect(() => {
    setFailed(false);
  }, [name]);

  const classes = [
    'admin-category-icon',
    tinted ? 'admin-category-icon-tinted' : 'admin-category-icon-img',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const dimensionStyle = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    maxWidth: size,
    maxHeight: size,
  };

  if (tinted) {
    return (
      <span
        className={classes}
        style={{
          ...dimensionStyle,
          WebkitMaskImage: `url("${src}")`,
          maskImage: `url("${src}")`,
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
      className={classes}
      style={dimensionStyle}
      onError={() => {
        if (!failed && iconName !== FALLBACK_ICON_ID) setFailed(true);
      }}
      aria-hidden="true"
    />
  );
}
