export function formatPrice(value) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}
