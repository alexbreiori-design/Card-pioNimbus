'use client';

/** Ícones Phosphor — CSS importado em CardapioAppV2. */
export function V2Icon({ name, className = '', fill = false, duotone = false }) {
  let prefix = 'ph';
  if (duotone) prefix = 'ph-duotone';
  else if (fill) prefix = 'ph-fill';

  const map = {
    home: 'ph-house',
    category: 'ph-squares-four',
    reviews: 'ph-star',
    info: 'ph-info',
    share: 'ph-share-network',
    clock: 'ph-clock',
    alarm: 'ph-alarm',
    motorcycle: 'ph-motorcycle',
    star: 'ph-star',
    'map-pin': 'ph-map-pin',
    phone: 'ph-phone',
    receipt: 'ph-receipt',
    'shopping-cart': 'ph-shopping-cart',
    'caret-right': 'ph-caret-right',
    'caret-left': 'ph-caret-left',
    'caret-down': 'ph-caret-down',
    'caret-up': 'ph-caret-up',
    'arrow-right': 'ph-arrow-right',
    check: 'ph-check',
    trash: 'ph-trash',
    plus: 'ph-plus',
  };
  const iconClass = map[name] || map.category;
  return (
    <i className={`${prefix} ${iconClass} cardapio-v2-icon ${className}`.trim()} aria-hidden="true" />
  );
}

function HeroGlassChip({ children, className = '' }) {
  return (
    <span className={`cardapio-v2-hero-glass-chip ${className}`.trim()}>
      <span className="cardapio-v2-hero-glass-chip-bg" aria-hidden="true" />
      <span className="cardapio-v2-hero-glass-chip-inner">{children}</span>
    </span>
  );
}

export { HeroGlassChip };
