import './globals.css';
import { readFileSync } from 'fs';
import { join } from 'path';

function getCardapioCss() {
  try {
    return readFileSync(join(process.cwd(), 'styles/cardapio.css'), 'utf8');
  } catch {
    return '';
  }
}

const cardapioCss = getCardapioCss();

export const metadata = {
  title: 'Cardápio Digital',
  description: 'Cardápio digital para restaurantes',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        {cardapioCss ? (
          <style dangerouslySetInnerHTML={{ __html: cardapioCss }} />
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
