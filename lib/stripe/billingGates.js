import {
  daysBetweenDateOnly,
  todaySaoPaulo,
  toDateOnlyIso,
} from '@/lib/stripe/carencia';
import { mapAssinaturaRow } from '@/lib/stripe/assinaturas';
import { mapStripeSubscriptionStatus } from '@/lib/stripe/client';
import { isAssinaturaUiEnabled } from '@/lib/features';

export const CAIXA_BILLING_BLOCK_CODE = 'CARENCIA_ENCERRADA';

export const CAIXA_BILLING_MESSAGES = {
  blocked:
    'Seu período de carência encerrou. Não é possível abrir o caixa até regularizar a assinatura.',
  blockedCaption:
    'Se você já efetuou o pagamento, entre em contato com o suporte para liberarmos seu acesso',
  three_days:
    'Faltam 3 dias para o fim da carência. Regularize o pagamento em Integrações para evitar interrupção.',
  last_day:
    'Hoje é o último dia da carência. Após o vencimento, o caixa só poderá ser aberto com a assinatura em dia.',
  storeReopenBlocked:
    'Não é possível reabrir a loja enquanto a assinatura estiver pendente. Regularize o pagamento em Integrações.',
};

const PAID_OK = new Set(['active', 'trialing']);

function pickStatusLocal(assinatura) {
  return assinatura?.statusLocal || assinatura?.status_local || null;
}

function pickCarenciaFim(assinatura) {
  return toDateOnlyIso(assinatura?.carenciaFim || assinatura?.carencia_fim || null);
}

function pickStatus(assinatura) {
  return mapStripeSubscriptionStatus(assinatura?.status);
}

/**
 * Gate operacional do caixa / loja aberta por assinatura Nimbus.
 * @returns {{
 *   enabled: boolean,
 *   blocked: boolean,
 *   warning: 'none'|'three_days'|'last_day',
 *   daysLeft: number|null,
 *   code: string|null,
 *   message: string|null,
 * }}
 */
export function resolveCaixaBillingGate({ empresa, assinatura } = {}) {
  const featureOn = isAssinaturaUiEnabled();
  const storeOn = Boolean(empresa?.assinatura_nimbus_habilitada);
  const enabled = featureOn && storeOn;

  if (!enabled) {
    return {
      enabled: false,
      blocked: false,
      warning: 'none',
      daysLeft: null,
      code: null,
      message: null,
    };
  }

  const statusLocal = pickStatusLocal(assinatura);
  const carenciaFim = pickCarenciaFim(assinatura);
  const today = todaySaoPaulo();
  const status = pickStatus(assinatura);

  const inValidCarencia =
    statusLocal === 'cortesia' && Boolean(carenciaFim) && carenciaFim >= today;

  if (inValidCarencia) {
    const daysLeft = daysBetweenDateOnly(today, carenciaFim);
    let warning = 'none';
    if (daysLeft === 3) warning = 'three_days';
    else if (daysLeft === 0) warning = 'last_day';

    return {
      enabled: true,
      blocked: false,
      warning,
      daysLeft,
      code: null,
      message:
        warning === 'three_days'
          ? CAIXA_BILLING_MESSAGES.three_days
          : warning === 'last_day'
            ? CAIXA_BILLING_MESSAGES.last_day
            : null,
    };
  }

  if (PAID_OK.has(status)) {
    return {
      enabled: true,
      blocked: false,
      warning: 'none',
      daysLeft: null,
      code: null,
      message: null,
    };
  }

  return {
    enabled: true,
    blocked: true,
    warning: 'none',
    daysLeft: carenciaFim ? daysBetweenDateOnly(today, carenciaFim) : null,
    code: CAIXA_BILLING_BLOCK_CODE,
    message: CAIXA_BILLING_MESSAGES.blocked,
  };
}

/** Carrega empresa + assinatura e resolve o gate (uso em rotas API). */
export async function loadCaixaBillingGate(supabase, { empresaId, slug } = {}) {
  let empresa = null;
  if (empresaId) {
    const { data, error } = await supabase
      .from('empresas')
      .select('id, slug, assinatura_nimbus_habilitada')
      .eq('id', empresaId)
      .maybeSingle();
    if (error) throw error;
    empresa = data;
  } else if (slug) {
    const { data, error } = await supabase
      .from('empresas')
      .select('id, slug, assinatura_nimbus_habilitada')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    empresa = data;
  }

  if (!empresa?.id) {
    return {
      empresa: null,
      assinatura: null,
      gate: resolveCaixaBillingGate({ empresa: null, assinatura: null }),
    };
  }

  const { data: row, error: assinaturaError } = await supabase
    .from('empresa_assinaturas')
    .select('*')
    .eq('empresa_id', empresa.id)
    .maybeSingle();
  if (assinaturaError) throw assinaturaError;

  const assinatura = mapAssinaturaRow(row);
  const gate = resolveCaixaBillingGate({ empresa, assinatura });
  return { empresa, assinatura, gate };
}
