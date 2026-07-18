const ENV_KEYS = new Set(['production', 'staging', 'preview', 'local']);

function normalizeEnvKey(value) {
  const key = String(value || '')
    .trim()
    .toLowerCase();
  if (key === 'prod') return 'production';
  if (key === 'development' || key === 'dev') return 'local';
  return ENV_KEYS.has(key) ? key : '';
}

function inferFromSiteUrl(siteUrl) {
  const url = String(siteUrl || '').trim().toLowerCase();
  if (!url) return '';
  if (url.includes('staging.')) return 'staging';
  if (url.includes('localhost') || url.includes('127.0.0.1')) return 'local';
  if (url.includes('vercel.app')) return 'preview';
  return '';
}

/** Ambiente lógico da aplicação (production | staging | preview | local). */
export function getRuntimeEnvironment() {
  const explicit = normalizeEnvKey(process.env.NEXT_PUBLIC_NIMBUS_APP_ENV);
  if (explicit) return explicit;

  const fromSite = inferFromSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (fromSite) return fromSite;

  if (process.env.NODE_ENV !== 'production') return 'local';

  return 'production';
}

export function isProductionRuntime() {
  return getRuntimeEnvironment() === 'production';
}

/** Credenciais manuais APP_USR: só na loja de teste, nunca para lojista real. */
export function allowsManualPaymentCredentials(slug = '') {
  return String(slug || '').trim().toLowerCase() === 'loja-teste';
}

export function shouldShowEnvironmentBanner() {
  return !isProductionRuntime();
}

export function getEnvironmentBannerCopy(env = getRuntimeEnvironment()) {
  switch (env) {
    case 'staging':
      return {
        title: 'Ambiente staging',
        detail: 'Versão de homologação — pedidos e dados aqui não são de clientes reais.',
      };
    case 'preview':
      return {
        title: 'Preview de deploy',
        detail: 'Branch de teste na Vercel — use só para validar antes de liberar.',
      };
    case 'local':
      return {
        title: 'Desenvolvimento local',
        detail: 'Ambiente da sua máquina — não compartilhe com clientes.',
      };
    default:
      return {
        title: 'Ambiente de testes',
        detail: 'Não é produção — pedidos aqui não são reais.',
      };
  }
}
