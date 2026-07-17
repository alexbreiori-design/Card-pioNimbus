import { createHmac, timingSafeEqual } from 'node:crypto';

const API_BASE = 'https://api.mercadopago.com';
const AUTH_BASE = 'https://auth.mercadopago.com.br/authorization';

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
      json?.cause?.[0]?.message ||
      'O Mercado Pago recusou a solicitação.';
    const error = new Error(message);
    error.status = response.status;
    error.details = json;
    throw error;
  }
  return json;
}

export function formatMercadoPagoAmount(amount) {
  return Number(amount).toFixed(2);
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
  // OAuth de produção (conta real da loja). Testes usam credenciais APP_USR do painel.
  return mpRequest('/oauth/token', {
    method: 'POST',
    body: {
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      test_token: 'false',
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

export async function validateMercadoPagoAccessToken(accessToken) {
  const token = String(accessToken || '').trim();
  if (!token.startsWith('APP_USR-') && !token.startsWith('TEST-')) {
    throw Object.assign(
      new Error('Access Token inválido. Use o token APP_USR das credenciais de teste ou produção.'),
      { status: 400 }
    );
  }
  return mpRequest('/users/me', { accessToken: token });
}

function firstOrderPayment(order) {
  return order?.transactions?.payments?.[0] || null;
}

export function mapMercadoPagoOrderStatus(order) {
  const payment = firstOrderPayment(order);
  const paymentStatus = String(payment?.status || '').toLowerCase();
  const paymentDetail = String(payment?.status_detail || '').toLowerCase();
  const orderStatus = String(order?.status || '').toLowerCase();

  if (
    paymentStatus === 'processed' ||
    paymentDetail === 'accredited' ||
    orderStatus === 'processed'
  ) {
    return 'aprovado';
  }
  if (
    paymentStatus === 'action_required' ||
    paymentDetail === 'waiting_transfer' ||
    orderStatus === 'action_required' ||
    orderStatus === 'created'
  ) {
    return paymentDetail.includes('waiting') || paymentStatus === 'action_required'
      ? 'pendente'
      : 'processando';
  }
  if (paymentStatus === 'in_process' || orderStatus === 'processing') return 'processando';
  if (paymentStatus === 'refunded' || orderStatus === 'refunded') return 'estornado';
  if (
    paymentStatus === 'cancelled' ||
    paymentStatus === 'canceled' ||
    orderStatus === 'cancelled' ||
    orderStatus === 'canceled'
  ) {
    return 'cancelado';
  }
  if (paymentStatus === 'expired' || orderStatus === 'expired') return 'expirado';
  if (
    paymentStatus === 'rejected' ||
    paymentStatus === 'failed' ||
    orderStatus === 'failed'
  ) {
    return 'recusado';
  }
  return 'erro';
}

export function extractMercadoPagoPix(order) {
  const payment = firstOrderPayment(order);
  const method = payment?.payment_method || {};
  const legacy = order?.point_of_interaction?.transaction_data || {};
  return {
    qrCode: method.qr_code || legacy.qr_code || null,
    qrCodeBase64: method.qr_code_base64 || legacy.qr_code_base64 || null,
    ticketUrl: method.ticket_url || legacy.ticket_url || null,
  };
}

export async function createMercadoPagoPayment({
  accessToken,
  amount,
  method,
  payer,
  externalReference,
  idempotencyKey,
  cardData,
}) {
  const total = formatMercadoPagoAmount(amount);
  const email = String(cardData?.payer?.email || payer.email || '').trim();
  if (!email) throw new Error('Informe um e-mail válido para pagar online.');

  const payerBody = {
    email,
  };
  const name = String(payer.name || '').trim();
  if (name) {
    const parts = name.split(/\s+/);
    payerBody.first_name = parts[0] || 'Cliente';
    if (parts.length > 1) payerBody.last_name = parts.slice(1).join(' ');
  }
  if (cardData?.payer?.identification) {
    payerBody.identification = cardData.payer.identification;
  }

  let paymentMethod;
  if (method === 'pix') {
    paymentMethod = {
      id: 'pix',
      type: 'bank_transfer',
    };
  } else {
    const token = cardData?.token;
    const paymentMethodId = cardData?.payment_method_id;
    const paymentType =
      cardData?.payment_type_id ||
      cardData?.paymentTypeId ||
      (String(paymentMethodId || '').includes('deb') ? 'debit_card' : 'credit_card');
    if (!token || !paymentMethodId) {
      throw new Error('Dados do cartão incompletos.');
    }
    paymentMethod = {
      id: paymentMethodId,
      type: paymentType === 'debit_card' ? 'debit_card' : 'credit_card',
      token,
      installments: Number(cardData?.installments || 1),
    };
  }

  const body = {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: total,
    external_reference: String(externalReference),
    payer: payerBody,
    transactions: {
      payments: [
        {
          amount: total,
          payment_method: paymentMethod,
          ...(method === 'pix' ? { expiration_time: 'PT30M' } : {}),
        },
      ],
    },
  };

  return mpRequest('/v1/orders', {
    method: 'POST',
    accessToken,
    body,
    headers: { 'X-Idempotency-Key': String(idempotencyKey) },
  });
}

export function getMercadoPagoOrder(accessToken, orderId) {
  return mpRequest(`/v1/orders/${encodeURIComponent(orderId)}`, { accessToken });
}

/** Sync: Orders API primeiro; fallback para /v1/payments legado. */
export async function getMercadoPagoPayment(accessToken, paymentId) {
  const id = String(paymentId || '');
  try {
    return await getMercadoPagoOrder(accessToken, id);
  } catch (error) {
    if (error?.status === 404) {
      return mpRequest(`/v1/payments/${encodeURIComponent(id)}`, { accessToken });
    }
    throw error;
  }
}

export function mapMercadoPagoStatus(statusOrOrder) {
  if (statusOrOrder && typeof statusOrOrder === 'object') {
    if (statusOrOrder.transactions?.payments) {
      return mapMercadoPagoOrderStatus(statusOrOrder);
    }
    return mapMercadoPagoStatus(statusOrOrder.status);
  }
  const status = String(statusOrOrder || '').toLowerCase();
  if (status === 'approved' || status === 'processed') return 'aprovado';
  if (status === 'pending' || status === 'action_required') return 'pendente';
  if (status === 'in_process' || status === 'authorized' || status === 'processing') {
    return 'processando';
  }
  if (status === 'rejected' || status === 'failed') return 'recusado';
  if (status === 'refunded' || status === 'charged_back') return 'estornado';
  if (status === 'cancelled' || status === 'canceled') return 'cancelado';
  if (status === 'expired') return 'expirado';
  return 'erro';
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
