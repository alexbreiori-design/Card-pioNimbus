import { readFileSync } from 'fs';
import { join } from 'path';

const HTML_PROTOTYPE =
  'H:/Sistema/Nimbus-Cardapio-Digital/EXEMPLOS/cardapio_digital_acai (2).html';

function getCardapioCss() {
  try {
    const fromFile = readFileSync(
      join(process.cwd(), 'styles/cardapio.css'),
      'utf8'
    );
    if (fromFile.length > 5000 && !fromFile.includes('PLACEHOLDER')) {
      return fromFile;
    }
  } catch {
    /* fall through */
  }
  try {
    const html = readFileSync(HTML_PROTOTYPE, 'utf8');
    return html.match(/<style>([\s\S]*?)<\/style>/)?.[1]?.trim() ?? '';
  } catch {
    return '';
  }
}

const cardapioCss = getCardapioCss();

export default function CardapioLayout({ children }) {
  return (
    <>
      {cardapioCss ? (
        <style dangerouslySetInnerHTML={{ __html: cardapioCss }} />
      ) : null}
      {children}
    </>
  );
}
