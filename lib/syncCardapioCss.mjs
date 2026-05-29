import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const htmlPath =
  'H:/Sistema/Nimbus-Cardapio-Digital/EXEMPLOS/cardapio_digital_acai (2).html';
const outPath = join(root, 'styles/cardapio.css');

export function syncCardapioCss() {
  const html = readFileSync(htmlPath, 'utf8');
  const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1]?.trim() ?? '';
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, style, 'utf8');
  return style;
}
