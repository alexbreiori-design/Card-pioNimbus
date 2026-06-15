'use client';

import Image from 'next/image';

function isSupabaseMenuAsset(url) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !url) return false;
  const value = String(url);
  return value.startsWith(base) && value.includes('/storage/v1/object/public/');
}

export default function MenuImageArea({
  imageUrl = '',
  className = '',
  placeholderClass = 'is-placeholder',
  alt = '',
  sizes = '112px',
  children,
  style,
}) {
  const hasImage = Boolean(imageUrl);
  const useNext = hasImage && isSupabaseMenuAsset(imageUrl);

  const classes = [
    className,
    hasImage ? 'has-image' : placeholderClass,
    useNext ? 'menu-img-next' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const inlineStyle =
    hasImage && !useNext
      ? {
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          ...style,
        }
      : style;

  return (
    <div className={classes} style={inlineStyle}>
      {useNext ? (
        <Image src={imageUrl} alt={alt} fill sizes={sizes} className="menu-img-next-fill" />
      ) : null}
      {children}
    </div>
  );
}
