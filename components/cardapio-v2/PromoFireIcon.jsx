'use client';

export default function PromoFireIcon({ size = 18, className = '' }) {
  const classes = ['cardapio-v2-promo-fire-icon', className].filter(Boolean).join(' ');

  return (
    <span
      className={classes}
      style={{ '--promo-fire-size': `${size}px` }}
      aria-hidden="true"
    >
      <i className="ph ph-fire" />
    </span>
  );
}
