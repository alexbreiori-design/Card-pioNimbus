import { readFileSync } from 'fs';
import { join } from 'path';

let cached = null;

/** CSS do cardápio público — só injetar em layouts de menu, não na landing. */
export function getCardapioCssInline() {
  if (cached !== null) return cached;
  try {
    cached = readFileSync(join(process.cwd(), 'styles/cardapio.css'), 'utf8');
  } catch {
    cached = '';
  }
  return cached;
}
