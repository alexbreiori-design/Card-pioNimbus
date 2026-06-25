'use client';

export default function AddonThumb({ imageUrl = '' }) {
  const src = String(imageUrl || '').trim();
  if (!src) {
    return <div className="addon-thumb is-placeholder" aria-hidden="true" />;
  }

  return (
    <div className="addon-thumb has-image">
      <img src={src} alt="" className="addon-thumb-img" loading="lazy" decoding="async" />
    </div>
  );
}
