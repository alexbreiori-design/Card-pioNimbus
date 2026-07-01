import { resolveCardapioFromPublicPayload } from '@/lib/catalogPublic';
import { mergeEmpresaIntoLoja } from '@/lib/supabase/empresa';
import { applyScheduleOpenStatus } from '@/lib/storeHours';
import { normalizeSlug } from '@/lib/normalize';
import { resolveSlugFromHost } from '@/lib/siteUrl';
import { resolveStoreSlugFromPathname } from '@/lib/cardapioV2';

function formatStoreAddress(loja) {
  const structured = [
    loja?.enderecoLogradouro,
    loja?.enderecoNumero ? `, ${loja.enderecoNumero}` : '',
    loja?.enderecoBairro ? ` - ${loja.enderecoBairro}` : '',
    loja?.enderecoCidade ? ` - ${loja.enderecoCidade}` : '',
    loja?.enderecoEstado ? `/${loja.enderecoEstado}` : '',
  ]
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return structured || loja?.endereco || '';
}

/** Slug da loja a partir da URL ou subdomínio (ignora /v2). */
export function resolveStoreSlugFromBrowser(fallback = '') {
  if (typeof window === 'undefined') return normalizeSlug(fallback);
  const fromPath = resolveStoreSlugFromPathname(window.location.pathname);
  if (fromPath) return fromPath;
  const fromHost = resolveSlugFromHost(window.location.hostname);
  if (fromHost) return fromHost;
  return normalizeSlug(fallback);
}

/** Hidrata estado inicial a partir do payload público (SSR ou API). */
export function buildCardapioBootState(initialPublicPayload, initialEmpresa, slug = '') {
  if (!initialPublicPayload || typeof initialPublicPayload !== 'object') return null;

  let loja = initialPublicPayload.loja || {};
  if (initialEmpresa) {
    loja = mergeEmpresaIntoLoja(loja, initialEmpresa);
  }
  const safeSlug = normalizeSlug(slug || loja.slug);
  if (safeSlug && !loja.slug) {
    loja = { ...loja, slug: safeSlug };
  }

  const lojaWithAddress = applyScheduleOpenStatus({
    ...loja,
    endereco: formatStoreAddress(loja),
  });

  const resolved = resolveCardapioFromPublicPayload(initialPublicPayload);

  return {
    loja: lojaWithAddress,
    resolved,
    snapshot: initialPublicPayload,
  };
}
