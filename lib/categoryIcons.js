export const CATEGORY_ICONS = [
  { id: 'burger', label: 'Lanches', path: '/icons/burger.svg' },
  { id: 'pizza', label: 'Pizza', path: '/icons/pizza.svg' },
  { id: 'drink', label: 'Bebidas', path: '/icons/drink.svg' },
  { id: 'dessert', label: 'Sobremesas', path: '/icons/dessert.svg' },
  { id: 'salad', label: 'Saladas', path: '/icons/salad.svg' },
  { id: 'combo', label: 'Combos', path: '/icons/combo.svg' },
  { id: 'promo', label: 'Promoções', path: '/icons/promo.svg' },
];

export function getCategoryIconPath(icone) {
  return CATEGORY_ICONS.find((item) => item.id === icone)?.path || CATEGORY_ICONS[0].path;
}
