import { notFound } from 'next/navigation';
import { CardapioProvider } from '@/context/CardapioContext';
import CardapioApp from '@/components/cardapio/CardapioApp';
import CardapioAppV2 from '@/components/cardapio-v2/CardapioAppV2';
import StoreUnavailable from '@/components/cardapio/StoreUnavailable';
import { isCardapioPublicV2 } from '@/lib/cardapioPublicVersion';
import { normalizeSlug } from '@/lib/normalize';
import { getSiteOrigin, getStorePublicUrl, toAbsoluteAssetUrl } from '@/lib/siteUrl';
import { getEmpresaBySlug } from '@/lib/supabase/empresaServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { fetchPublicStoreCatalogRow } from '@/lib/supabase/storeStateServer';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    return {
      title: 'Loja não encontrada',
      description: 'Este cardápio não está disponível.',
    };
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return { title: safeSlug };
  }

  const [empresa, catalog] = await Promise.all([
    getEmpresaBySlug(supabase, safeSlug),
    fetchPublicStoreCatalogRow(safeSlug),
  ]);

  if (!empresa?.id && !catalog?.data) {
    return {
      title: 'Loja não encontrada',
      description: 'O endereço que você acessou não corresponde a nenhum cardápio ativo.',
    };
  }

  const loja = catalog?.data?.loja || {};
  const name = loja.nome || empresa?.nome || safeSlug;
  const description =
    String(loja.descricao || '').trim() ||
    `Faça seu pedido online em ${name}. Veja o cardápio, promoções e entrega.`;
  const pageUrl = getStorePublicUrl(safeSlug);
  const imageUrl = toAbsoluteAssetUrl(loja.capaUrl || loja.logoUrl, getSiteOrigin());

  return {
    title: name,
    description,
    openGraph: {
      title: name,
      description,
      url: pageUrl,
      type: 'website',
      locale: 'pt_BR',
      ...(imageUrl ? { images: [{ url: imageUrl, alt: name }] } : {}),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: name,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export default async function LojaPublicaPage({ params }) {
  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) notFound();

  const supabase = getServiceClient();
  let empresa = null;
  let catalog = null;

  if (supabase) {
    [empresa, catalog] = await Promise.all([
      getEmpresaBySlug(supabase, safeSlug),
      fetchPublicStoreCatalogRow(safeSlug),
    ]);
    if (!empresa?.id && !catalog?.data) {
      notFound();
    }
    if (empresa?.suspensa) {
      const nome = catalog?.data?.loja?.nome || empresa.nome || safeSlug;
      return <StoreUnavailable nome={nome} />;
    }
  }

  return (
    <CardapioProvider
      slug={safeSlug}
      initialPublicPayload={catalog?.data ?? null}
      initialEmpresa={empresa}
    >
      {isCardapioPublicV2(empresa?.cardapio_publico_versao) ? <CardapioAppV2 /> : <CardapioApp />}
    </CardapioProvider>
  );
}
