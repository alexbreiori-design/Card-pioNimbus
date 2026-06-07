import { withDerivedData } from '@/lib/adminData';
import { applyScheduleOpenStatus } from '@/lib/storeHours';

/** Campos da loja expostos no cardápio público (sem PII operacional). */
const PUBLIC_LOJA_KEYS = new Set([
  'nome',
  'slug',
  'telefone',
  'whatsapp',
  'endereco',
  'pedidoMinimo',
  'descricao',
  'aberta',
  'corMarca',
  'chavePix',
  'descricaoChavePix',
  'metaPixelId',
  'tempoEntregaDelivery',
  'tempoEntregaRetirada',
  'paletteColors',
  'paletteLogoUrl',
  'logoUrl',
  'capaUrl',
  'horarios',
  'fechadaManual',
]);

function pickPublicLoja(loja = {}) {
  const picked = {};
  for (const key of PUBLIC_LOJA_KEYS) {
    if (loja[key] !== undefined) picked[key] = loja[key];
  }
  return picked;
}

/** Remove pedidos, clientes e metadados sensíveis do JSON da loja. */
export function sanitizePublicStoreState(data) {
  if (!data || typeof data !== 'object') return null;

  const safeCupons = (Array.isArray(data.cupons) ? data.cupons : [])
    .filter((c) => c.ativo !== false)
    .map(({ codigo, tipoDesconto, valorDesconto, percentualDesconto, ativo, ordem, id }) => ({
      id,
      codigo,
      tipoDesconto,
      valorDesconto,
      percentualDesconto,
      ativo,
      ordem,
    }));

  return withDerivedData({
    _meta: {
      revision: data._meta?.revision ?? 0,
      clientUpdatedAt: data._meta?.clientUpdatedAt ?? null,
    },
    loja: applyScheduleOpenStatus(pickPublicLoja(data.loja)),
    categorias: data.categorias || [],
    produtos: data.produtos || [],
    marmitas: data.marmitas || [],
    marmitaCardapio: data.marmitaCardapio || null,
    adicionaisCategorias: data.adicionaisCategorias || [],
    adicionaisItens: data.adicionaisItens || [],
    promocoes: data.promocoes || [],
    cupons: safeCupons,
    clientes: [],
    pedidos: [],
  });
}
