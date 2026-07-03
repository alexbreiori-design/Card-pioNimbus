import { notFound } from 'next/navigation';
import { CardapioProvider } from '@/context/CardapioContext';
import CardapioAppV2 from '@/components/cardapio-v2/CardapioAppV2';
import StoreUnavailable from '@/components/cardapio/StoreUnavailable';
import { requireCardapioV2PreviewAccess } from '@/lib/cardapioV2Server';
import { normalizeSlug } from '@/lib/normalize';
import { getEmpresaBySlug } from '@/lib/supabase/empresaServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { readProductIdFromSearchParams } from '@/lib/productDeepLink';
import { fetchPublicStoreCatalogRow } from '@/lib/supabase/storeStateServer';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function LojaPublicaV2Page({ params, searchParams }) {
  const { slug } = await params;
  const productId = readProductIdFromSearchParams(await searchParams);
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) notFound();

  await requireCardapioV2PreviewAccess(safeSlug);

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
      initialProductId={productId}
    >
      <CardapioAppV2 />
    </CardapioProvider>
  );
}
