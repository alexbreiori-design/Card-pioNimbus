import { normalizeSlug } from '@/lib/normalize';

export const CARDAPIO_V2_SECTION = {
  inicio: 'cardapio-v2-conteudo',
  avaliacoes: 'cardapio-v2-avaliacoes',
  informacoes: 'cardapio-v2-informacoes',
};

export function cardapioV2CategorySectionId(categoryName) {
  const slug = normalizeSlug(String(categoryName || '').replace(/[^\w\s-]/g, ''));
  return slug ? `cardapio-v2-cat-${slug}` : 'cardapio-v2-cat-secao';
}

export function scrollToCardapioV2Section(sectionId) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(sectionId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
