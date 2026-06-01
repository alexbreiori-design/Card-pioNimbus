import { notFound } from 'next/navigation';
import { CardapioProvider } from '@/context/CardapioContext';
import CardapioApp from '@/components/cardapio/CardapioApp';
import { normalizeSlug } from '@/lib/normalize';
import { getEmpresaBySlug } from '@/lib/supabase/empresaServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { fetchPublicStoreCatalogRow } from '@/lib/supabase/storeStateServer';

export default async function LojaPublicaPage({ params }) {
  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) notFound();

  const supabase = getServiceClient();
  if (supabase) {
    const [empresa, catalog] = await Promise.all([
      getEmpresaBySlug(supabase, safeSlug),
      fetchPublicStoreCatalogRow(safeSlug),
    ]);
    if (!empresa?.id && !catalog?.data) {
      notFound();
    }
  }

  return (
    <CardapioProvider slug={safeSlug}>
      <CardapioApp />
    </CardapioProvider>
  );
}
