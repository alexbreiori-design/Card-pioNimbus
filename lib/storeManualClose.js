import { applyScheduleOpenStatus, resolveStoreOpenStatus } from '@/lib/storeHours';
import { updateEmpresaBySlug } from '@/lib/supabase/empresa';

/**
 * Alterna fechamento manual da loja e persiste em menu_store_state + empresas.aberta.
 */
export async function persistStoreManualClose({ saveData, slug, fechadaManual, loja }) {
  const baseLoja = { ...loja, fechadaManual: Boolean(fechadaManual) };
  const nextLoja = applyScheduleOpenStatus(baseLoja);
  const { aberta } = resolveStoreOpenStatus(nextLoja);

  await saveData((prev) => ({
    ...prev,
    loja: {
      ...prev.loja,
      ...nextLoja,
      fechadaManual: baseLoja.fechadaManual,
      aberta,
    },
  }));

  if (slug) {
    await updateEmpresaBySlug(slug, { aberta });
  }

  return { aberta, fechadaManual: baseLoja.fechadaManual };
}
