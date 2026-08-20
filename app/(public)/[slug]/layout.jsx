import { getCardapioCssInline } from '@/lib/cardapioCss';

export default function PublicSlugLayout({ children }) {
  const cardapioCss = getCardapioCssInline();

  return (
    <>
      {cardapioCss ? <style dangerouslySetInnerHTML={{ __html: cardapioCss }} /> : null}
      {children}
    </>
  );
}
