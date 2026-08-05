/** Flags do cardápio embutido no hero da landing (`?landingDemo=1&embed=1`). */

export const LANDING_DEMO_CARD = {
  holderName: 'Cliente Demonstração',
  number: '4111 1111 1111 1111',
  expiry: '12/30',
  securityCode: '123',
  email: 'demo@cardapionimbus.com.br',
  cpfCnpj: '529.982.247-25',
};

export const LANDING_DEMO_CUSTOMER = {
  name: 'Cliente Demonstração',
  phone: '(43) 99999-0000',
};

export function readCardapioEmbedFlags(search = '') {
  const raw =
    search ||
    (typeof window !== 'undefined' ? window.location.search : '');
  const params = new URLSearchParams(raw.startsWith('?') ? raw : `?${raw}`);
  return {
    isLandingDemo: params.get('landingDemo') === '1',
    isEmbed: params.get('embed') === '1',
  };
}

/** URL same-origin do embed (evita apontar para outro host via ROOT_DOMAIN). */
export function buildLandingDemoEmbedUrl(slug) {
  const safe = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  return `/${safe || 'loja-teste'}?landingDemo=1&embed=1`;
}
