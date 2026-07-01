import {
  CARDAPIO_PUBLIC_VERSION_V1,
  CARDAPIO_PUBLIC_VERSION_V2,
  normalizeCardapioPublicVersion,
} from '@/lib/cardapioPublicVersion';
import { normalizeSlug } from '@/lib/normalize';

export async function setStoreCardapioPublicVersion(supabase, slug, version) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    throw Object.assign(new Error('Slug inválido.'), { status: 400 });
  }

  const nextVersion = normalizeCardapioPublicVersion(version);
  if (version !== CARDAPIO_PUBLIC_VERSION_V1 && version !== CARDAPIO_PUBLIC_VERSION_V2) {
    throw Object.assign(new Error('Versão inválida. Use v1 ou v2.'), { status: 400 });
  }

  const { data, error } = await supabase
    .from('empresas')
    .update({
      cardapio_publico_versao: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('slug', safeSlug)
    .select('slug, cardapio_publico_versao')
    .maybeSingle();

  if (error?.message?.includes('cardapio_publico_versao')) {
    throw Object.assign(
      new Error('Rode a migration 024 (cardapio_publico_versao) no Supabase.'),
      { status: 400 }
    );
  }
  if (error) throw error;
  if (!data) {
    throw Object.assign(new Error('Loja não encontrada.'), { status: 404 });
  }

  return {
    slug: data.slug,
    cardapio_publico_versao: normalizeCardapioPublicVersion(data.cardapio_publico_versao),
  };
}
