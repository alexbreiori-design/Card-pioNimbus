import { getRuntimeEnvironment } from '@/lib/runtimeEnvironment';

const PAGBANK_API_LIVE = 'https://api.pagseguro.com';
const PAGBANK_API_SANDBOX = 'https://sandbox.api.pagseguro.com';
const PAGBANK_CONNECT_LIVE = 'https://connect.pagbank.com.br/oauth2/authorize';
const PAGBANK_CONNECT_SANDBOX =
  'https://connect.sandbox.pagbank.com.br/oauth2/authorize';

function pagBankConfig() {
  const environment = String(process.env.PAGBANK_ENVIRONMENT || '')
    .trim()
    .toLowerCase();
  const sandbox =
    environment === 'sandbox' ||
    (environment !== 'production' && getRuntimeEnvironment() !== 'production');
  return {
    sandbox,
    apiBase: sandbox ? PAGBANK_API_SANDBOX : PAGBANK_API_LIVE,
    connectBase: sandbox ? PAGBANK_CONNECT_SANDBOX : PAGBANK_CONNECT_LIVE,
    clientId: String(process.env.PAGBANK_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.PAGBANK_CLIENT_SECRET || '').trim(),
    platformToken: String(process.env.PAGBANK_PLATFORM_TOKEN || '').trim(),
  };
}

async function pagBankRequest(
  path,
  { method = 'GET', accessToken, body, headers = {}, applicationAuth = false } = {}
) {
  const config = pagBankConfig();
  const requestHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...headers,
  };
  if (applicationAuth) {
    if (!config.clientId || !config.clientSecret || !config.platformToken) {
      throw new Error('Credenciais da aplicação PagBank não configuradas.');
    }
    requestHeaders.Authorization = `Bearer ${config.platformToken}`;
    requestHeaders.X_CLIENT_ID = config.clientId;
    requestHeaders.X_CLIENT_SECRET = config.clientSecret;
  } else if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${config.apiBase}${path}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const firstError = Array.isArray(json?.error_messages)
      ? json.error_messages[0]
      : Array.isArray(json?.errors)
        ? json.errors[0]
        : null;
    const message =
      (firstError?.parameter_name
        ? `${firstError.description || firstError.message || 'Campo inválido'} (${firstError.parameter_name})`
        : firstError?.description || firstError?.message) ||
      json?.error_description ||
      json?.message ||
      json?.error ||
      `O PagBank recusou a solicitação (${response.status}).`;
    console.error('[pagbank]', path, response.status, JSON.stringify(json).slice(0, 1500));
    const error = new Error(String(message).slice(0, 400));
    error.status = response.status >= 400 && response.status < 600 ? response.status : 502;
    error.details = json;
    throw error;
  }
  return json;
}

export function isPagBankSandbox() {
  return pagBankConfig().sandbox;
}

export function getPagBankAuthorizationUrl({ redirectUri, state }) {
  const config = pagBankConfig();
  if (!config.clientId) throw new Error('PAGBANK_CLIENT_ID não configurado.');
  const url = new URL(config.connectBase);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set(
    'scope',
    ['payments.read', 'payments.create', 'payments.refund', 'accounts.read'].join(' ')
  );
  url.searchParams.set('state', state);
  return url.toString();
}

export function exchangePagBankCode({ code, redirectUri }) {
  return pagBankRequest('/oauth2/token', {
    method: 'POST',
    applicationAuth: true,
    body: {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    },
  });
}

export function refreshPagBankToken(refreshToken) {
  return pagBankRequest('/oauth2/refresh', {
    method: 'POST',
    applicationAuth: true,
    body: {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    },
  });
}

function cents(value) {
  return Math.max(1, Math.round(Number(value || 0) * 100));
}

function cleanReference(value, fallback = 'pedido') {
  const cleaned = String(value || '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64);
  return cleaned || fallback;
}

function toPagBankExpirationDate(value) {
  const date = value ? new Date(value) : new Date(Date.now() + 15 * 60 * 1000);
  const safe = Number.isNaN(date.getTime())
    ? new Date(Date.now() + 15 * 60 * 1000)
    : date;
  // PagBank exemplos usam offset -03:00.
  const offsetMs = -3 * 60 * 60 * 1000;
  const local = new Date(safe.getTime() + offsetMs);
  return local.toISOString().replace('Z', '-03:00');
}

function buildPagBankItems(order, totalInCents) {
  const items = [];
  for (const [index, item] of (order?.itens || []).entries()) {
    const quantity = Math.max(1, Math.round(Number(item.qtd || item.quantity || 1)));
    const unitAmount = cents(item.precoUnit ?? item.unit_price ?? 0);
    if (unitAmount <= 0) continue;
    items.push({
      reference_id: cleanReference(item.produtoId || `item-${index + 1}`),
      name: String(item.nome || item.title || 'Item').trim().slice(0, 64) || 'Item',
      quantity,
      unit_amount: unitAmount,
    });
  }
  const itemTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_amount,
    0
  );
  if (!items.length || itemTotal !== totalInCents) {
    return [
      {
        reference_id: 'pedido',
        name: 'Pedido online',
        quantity: 1,
        unit_amount: totalInCents,
      },
    ];
  }
  return items;
}

function buildPagBankCustomer(payer = {}) {
  const phone = String(payer?.phone || '').replace(/\D/g, '');
  const taxId = String(payer?.taxId || '').replace(/\D/g, '');
  const email = String(payer?.email || '').trim().toLowerCase();
  if (!email) {
    throw Object.assign(new Error('Informe um e-mail válido para pagar com PagBank.'), {
      status: 400,
    });
  }
  if (!taxId) {
    throw Object.assign(new Error('Informe o CPF ou CNPJ para pagar com PagBank.'), {
      status: 400,
    });
  }
  const customer = {
    name: String(payer?.name || 'Cliente').trim().slice(0, 50) || 'Cliente',
    email: email.slice(0, 60),
    tax_id: taxId,
  };
  if (phone.length >= 10) {
    customer.phones = [
      {
        country: '55',
        area: phone.slice(0, 2),
        number: phone.slice(2),
        type: 'MOBILE',
      },
    ];
  }
  return customer;
}

function withNotificationUrls(body, notificationUrl) {
  if (notificationUrl && /^https:\/\//i.test(notificationUrl)) {
    body.notification_urls = [notificationUrl];
  }
  return body;
}

export async function getPagBankPublicKey(accessToken) {
  return pagBankRequest('/public-keys/card', { accessToken });
}

export async function createPagBankPublicKey(accessToken) {
  return pagBankRequest('/public-keys', {
    method: 'POST',
    accessToken,
    body: { type: 'card' },
  });
}

/** Garante chave pública de criptografia de cartão na conta do lojista. */
export async function ensurePagBankPublicKey(accessToken) {
  try {
    const existing = await getPagBankPublicKey(accessToken);
    const key = String(existing?.public_key || existing?.key || '').trim();
    if (key) return key;
  } catch (error) {
    if (error?.status && error.status !== 404) throw error;
  }
  const created = await createPagBankPublicKey(accessToken);
  const key = String(created?.public_key || created?.key || '').trim();
  if (!key) throw new Error('Não foi possível obter a chave pública do PagBank.');
  return key;
}

export function createPagBankPixOrder({
  accessToken,
  amount,
  payer,
  order,
  externalReference,
  notificationUrl,
  expirationDate,
}) {
  const total = cents(amount);
  const body = withNotificationUrls(
    {
      reference_id: cleanReference(externalReference),
      customer: buildPagBankCustomer(payer),
      items: buildPagBankItems(order, total),
      qr_codes: [
        {
          amount: { value: total },
          expiration_date: toPagBankExpirationDate(expirationDate),
        },
      ],
    },
    notificationUrl
  );

  return pagBankRequest('/orders', {
    method: 'POST',
    accessToken,
    headers: {
      'x-idempotency-key': String(externalReference),
    },
    body,
  });
}

export function createPagBankCardOrder({
  accessToken,
  amount,
  payer,
  order,
  externalReference,
  notificationUrl,
  encryptedCard,
  installments = 1,
  softDescriptor = null,
}) {
  const total = cents(amount);
  const encrypted = String(encryptedCard || '').trim();
  if (!encrypted) {
    throw Object.assign(new Error('Dados do cartão incompletos.'), { status: 400 });
  }
  const customer = buildPagBankCustomer(payer);
  const body = withNotificationUrls(
    {
      reference_id: cleanReference(externalReference),
      customer,
      items: buildPagBankItems(order, total),
      charges: [
        {
          reference_id: cleanReference(`charge-${externalReference}`, 'charge'),
          description: 'Pedido online',
          amount: {
            value: total,
            currency: 'BRL',
          },
          payment_method: {
            type: 'CREDIT_CARD',
            installments: Math.max(1, Math.min(12, Number(installments) || 1)),
            capture: true,
            card: {
              encrypted,
              store: false,
            },
            holder: {
              name: customer.name,
              tax_id: customer.tax_id,
            },
            ...(() => {
              const descriptor = softDescriptor
                ? String(softDescriptor)
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-zA-Z0-9 ]/g, '')
                    .trim()
                    .slice(0, 17)
                : '';
              return descriptor ? { soft_descriptor: descriptor } : {};
            })(),
          },
        },
      ],
    },
    notificationUrl
  );

  return pagBankRequest('/orders', {
    method: 'POST',
    accessToken,
    headers: {
      'x-idempotency-key': String(externalReference),
    },
    body,
  });
}

export function getPagBankOrder(accessToken, orderId) {
  return pagBankRequest(`/orders/${encodeURIComponent(orderId)}`, { accessToken });
}

export function mapPagBankStatus(order) {
  const charge = Array.isArray(order?.charges) ? order.charges[0] : null;
  const status = String(charge?.status || '').toUpperCase();
  // Com capture:true o sucesso costuma ser PAID; AUTHORIZED também cobre cartões de teste.
  if (status === 'PAID' || status === 'AUTHORIZED') return 'aprovado';
  if (status === 'IN_ANALYSIS') return 'processando';
  if (status === 'DECLINED') return 'recusado';
  if (status === 'CANCELED') {
    const refunded = Number(charge?.amount?.summary?.refunded || 0);
    return refunded > 0 ? 'estornado' : 'cancelado';
  }
  if (status === 'WAITING') return 'pendente';

  const qrCode = Array.isArray(order?.qr_codes) ? order.qr_codes[0] : null;
  const expiration = qrCode?.expiration_date
    ? new Date(qrCode.expiration_date).getTime()
    : 0;
  if (expiration && expiration <= Date.now()) return 'expirado';
  return 'pendente';
}

export async function extractPagBankPix(order, accessToken) {
  const qrCode = Array.isArray(order?.qr_codes) ? order.qr_codes[0] : null;
  const links = Array.isArray(qrCode?.links) ? qrCode.links : [];
  const base64Link = links.find(
    (link) => String(link?.rel || '').toUpperCase() === 'QRCODE.BASE64'
  );
  const imageLink = links.find((link) => link?.media === 'image/png');
  let text = qrCode?.text || qrCode?.emv || null;
  let imageBase64 = null;
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  if (imageLink?.href) {
    const response = await fetch(imageLink.href, { headers, cache: 'no-store' });
    if (response.ok) {
      imageBase64 = Buffer.from(await response.arrayBuffer()).toString('base64');
    }
  }
  if (!imageBase64 && base64Link?.href) {
    const response = await fetch(base64Link.href, { headers, cache: 'no-store' });
    if (response.ok) {
      const raw = (await response.text()).trim();
      imageBase64 = raw.replace(/^data:image\/\w+;base64,/, '');
    }
  }
  return {
    qrCode: text,
    qrCodeBase64: imageBase64,
    ticketUrl: imageLink?.href || base64Link?.href || null,
  };
}
