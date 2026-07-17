import { createHmac, timingSafeEqual } from 'node:crypto';

const API_BASE = 'https://api.mercadopago.com';
const AUTH_BASE = 'https://auth.mercadopago.com/authorization';

async function mpRequest(path, { method = 'GET', accessToken, body, headers = {} } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      json?.message ||
      json?.error ||
      json?.cause?.[0]?.description ||
      'O Mercado Pago recusou a solicitação.';
    const error = new Error(message);
    error.status = response.status;
    error.details = json;
    throw error;
  }
  return json;
}

export function getMercadoPagoAuthorizationUrl({ redirectUri, state }) {
  const clientId = process.env.MP_CLIENT_ID;
  if (!clientId) throw new Error('MP_CLIENT_ID não configurado.');
  const url = new URL(AUTH_BASE);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('platform_id', 'mp');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeMercadoPagoCode({ code, redirectUri }) {
  return mpRequest('/oauth/token', {
    method: 'POST',
    body: {
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    },
  });
}

export async function refreshMercadoPagoToken(refreshToken) {
  return mpRequest('/oauth/token', {
    method: 'POST',
    body: {
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    },
  });
}

export async function createMercadoPagoPayment({
  accessToken,
  amount,
  method,
  payer,
  externalReference,
  idempotencyKey,
  notificationUrl,
  cardData,
}) {
  const base = {
    transaction_amount: Number(amount),
    description: `Pedido ${externalReference}`,
    external_reference: externalReference,
    notification_url: notificationUrl,
    payer: {
      email: String(cardData?.payer?.email || payer.email || '').trim(),
      first_name: String(payer.name || '').trim().split(/\s+/)[0] || 'Cliente',
      last_name: String(payer.name || '').trim().split(/\s+/).slice(1).join(' ') || undefined,
    },
  };

  const body =
    method === 'pix'
      ? {
          ...base,
          payment_method_id: 'pix',
          date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        }
      : {
          ...base,
          token: cardData?.token,
          installments: Number(cardData?.installments || 1),
          payment_method_id: cardData?.payment_method_id,
          issuer_id: cardData?.issuer_id || undefined,
          payer: {
            ...base.payer,
            identification: cardData?.payer?.identification || undefined,
          },
        };

  if (!body.payer.email) throw new Error('Informe um e-mail válido para pagar online.');
  if (method !== 'pix' && (!body.token || !body.payment_method_id)) {
    throw new Error('Dados do cartão incompletos.');
  }

  return mpRequest('/v1/payments', {
    method: 'POST',
    accessToken,
    body,
    headers: { 'X-Idempotency-Key': idempotencyKey },
  });
}

export function getMercadoPagoPayment(accessToken, paymentId) {
  return mpRequest(`/v1/payments/${encodeURIComponent(paymentId)}`, { accessToken });
}

export function mapMercadoPagoStatus(status) {
  if (status === 'approved') return 'aprovado';
  if (status === 'pending') return 'pendente';
  if (status === 'in_process' || status === 'authorized') return 'processando';
  if (status === 'rejected') return 'recusado';
  if (status === 'refunded' || status === 'charged_back') return 'estornado';
  if (status === 'cancelled') return 'cancelado';
  return 'erro';
}

export function extractMercadoPagoPix(payment) {
  const transaction = payment?.point_of_interaction?.transaction_data || {};
  return {
    qrCode: transaction.qr_code || null,
    qrCodeBase64: transaction.qr_code_base64 || null,
    ticketUrl: transaction.ticket_url || null,
  };
}

export function verifyMercadoPagoWebhook(request, dataId) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;
  const signatureHeader = request.headers.get('x-signature') || '';
  const requestId = request.headers.get('x-request-id') || '';
  const parts = Object.fromEntries(
    signatureHeader
      .split(',')
      .map((part) => part.trim().split('='))
      .filter(([key, value]) => key && value)
  );
  if (!parts.ts || !parts.v1) return false;

  let manifest = '';
  if (dataId) manifest += `id:${String(dataId).toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${parts.ts};`;

  const expected = createHmac('sha256', secret).update(manifest).digest();
  const actual = Buffer.from(parts.v1, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
