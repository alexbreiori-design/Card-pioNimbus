import { applyScheduleOpenStatus, resolveStoreOpenStatus } from '@/lib/storeHours';
import { updateEmpresaBySlug } from '@/lib/supabase/empresa';
import { CAIXA_BILLING_MESSAGES } from '@/lib/stripe/billingGates';

/**
 * Alterna fechamento manual da loja e persiste em menu_store_state + empresas.aberta.
 * Reabrir (fechadaManual=false) consulta o gate de assinatura e bloqueia se pendente.
 */
export async function persistStoreManualClose({ saveData, slug, fechadaManual, loja }) {
  const wantsReopen = !Boolean(fechadaManual);

  if (wantsReopen && slug && typeof window !== 'undefined') {
    try {
      const response = await fetch(`/api/admin/billing?slug=${encodeURIComponent(slug)}`);
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload?.caixaGate?.blocked) {
        const err = new Error(CAIXA_BILLING_MESSAGES.storeReopenBlocked);
        err.code = payload.caixaGate.code || 'CARENCIA_ENCERRADA';
        throw err;
      }
    } catch (error) {
      if (error?.code === 'CARENCIA_ENCERRADA') throw error;
      // Falha de rede/API: não impede reabrir (fail-open).
    }
  }

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
