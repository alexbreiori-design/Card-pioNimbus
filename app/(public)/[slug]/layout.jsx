import { getCardapioCssInline } from '@/lib/cardapioCss';

/* Estado da loja (aberta/fechada, catálogo) precisa ser lido a cada request. */
export const dynamic = 'force-dynamic';

export default function PublicSlugLayout({ children }) {
  const cardapioCss = getCardapioCssInline();

  return (
    <>
      {cardapioCss ? <style dangerouslySetInnerHTML={{ __html: cardapioCss }} /> : null}
      {children}
    </>
  );
}
