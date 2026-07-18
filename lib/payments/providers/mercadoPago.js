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
    const firstError = Array.isArray(json?.errors) ? json.errors[0] : null;
    const message =
      json?.message ||
      firstError?.message ||
      firstError?.description ||
      json?.error ||
      json?.cause?.[0]?.description ||
      json?.cause?.[0]?.message ||
      (typeof json?.error === 'string' ? json.error : null) ||
      `O Mercado Pago recusou a solicitação (${response.status}).`;
    console.error('[mercadoPago]', path, response.status, JSON.stringify(json).slice(0, 1500));
    const error = new Error(String(message).slice(0, 400));
    error.status = response.status >= 400 && response.status < 600 ? response.status : 502;
    error.details = json;
    throw error;
  }
  return json;
}

export function formatMercadoPagoAmount(amount) {
  return Number(amount).toFixed(2);
}

/** Nome no extrato do cartão: até 13 chars (limite comum das bandeiras no BR). */
export function buildMercadoPagoStatementDescriptor(storeName) {
  const cleaned = String(storeName || 'PEDIDO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  const value = (cleaned || 'PEDIDO').slice(0, 13).trim();
  return value || 'PEDIDO';
}

export function normalizeMercadoPagoIdentification(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = String(raw.type || '').trim().toUpperCase();
  const number = String(raw.number || '').replace(/\D/g, '');
  if (!type || number.length < 11) return null;
  return { type, number };
}

function moneyNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** Monta items da Orders API somando o total cobrado (produtos + frete − desconto). */
export function buildMercadoPagoOrderItems(order, validated = {}) {
  const items = [];
  for (const item of order?.itens || []) {
    const quantity = Math.max(1, Math.round(Number(item.qtd || item.quantity || 1)));
    const unitPrice = moneyNumber(item.precoUnit ?? item.unit_price ?? 0);
    const title = String(item.nome || item.title || 'Item').trim().slice(0, 150) || 'Item';
    if (unitPrice <= 0) continue;
    items.push({
      title,
      description: String(item.obs || item.description || title).trim().slice(0, 100) || title,
      quantity,
      unit_price: formatMercadoPagoAmount(unitPrice),
      category_id: 'food',
      external_code: item.produtoId ? String(item.produtoId).slice(0, 100) : undefined,
    });
  }

  const frete = moneyNumber(validated.frete ?? order?.frete ?? 0);
  if (frete > 0) {
    items.push({
      title: 'Taxa de entrega',
      description: 'Entrega',
      quantity: 1,
      unit_price: formatMercadoPagoAmount(frete),
      category_id: 'services',
    });
  }

  let discountLeft = moneyNumber(validated.desconto ?? order?.desconto ?? 0);
  for (let i = items.length - 1; i >= 0 && discountLeft > 0.009; i -= 1) {
    const qty = items[i].quantity;
    const unit = moneyNumber(items[i].unit_price);
    const line = moneyNumber(unit * qty);
    const cut = Math.min(line, discountLeft);
    const nextLine = moneyNumber(line - cut);
    items[i].unit_price = formatMercadoPagoAmount(qty > 0 ? nextLine / qty : 0);
    discountLeft = moneyNumber(discountLeft - cut);
  }

  const filtered = items.filter((item) => moneyNumber(item.unit_price) > 0);
  if (!filtered.length) {
    const total = moneyNumber(validated.total ?? order?.total ?? 0);
    if (total > 0) {
      filtered.push({
        title: 'Pedido',
        description: 'Pedido online',
        quantity: 1,
        unit_price: formatMercadoPagoAmount(total),
        category_id: 'food',
      });
    }
  }
  return filtered.map(({ external_code, ...rest }) =>
    external_code ? { ...rest, external_code } : rest
  );
}

function buildShipmentAddress(address) {
  if (!address) return null;
  const zip = String(address.cep || address.zip_code || '').replace(/\D/g, '');
  const city = String(address.cidade || address.city || address.city_name || '').trim();
  const state = String(address.estado || address.state || address.state_name || '').trim();
  const street = String(address.logradouro || address.rua || address.street_name || '').trim();
  const number = String(address.numero || address.num || address.street_number || '').trim();
  const neighborhood = String(address.bairro || address.neighborhood || '').trim();
  if (!zip && !city && !state) return null;
  return {
    zip_code: zip || undefined,
    city: city || undefined,
    state: state || undefined,
    street_name: street || undefined,
    street_number: number || undefined,
    neighborhood: neighborhood || undefined,
    complement: String(address.complemento || address.complement || '').trim() || undefined,
  };
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
  order = null,
  validated = null,
  storeName = null,
  registrationDate = null,
  sandbox = false,
  deviceId = null,
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
    // Pix de teste: first_name APRO faz o MP auto-aprovar (docs Orders).
    payerBody.first_name =
      sandbox && method === 'pix' ? 'APRO' : parts[0] || 'Cliente';
    if (parts.length > 1) payerBody.last_name = parts.slice(1).join(' ');
  } else if (sandbox && method === 'pix') {
    payerBody.first_name = 'APRO';
  }

  const identification =
    normalizeMercadoPagoIdentification(cardData?.payer?.identification) ||
    normalizeMercadoPagoIdentification(cardData?.identification) ||
    normalizeMercadoPagoIdentification(payer?.identification) ||
    (sandbox
      ? { type: 'CPF', number: '12345678909' }
      : null);
  if (identification) {
    payerBody.identification = identification;
  }

  // Telefone no payer: suportado em cartão; Pix costuma falhar com propriedades extras.
  if (method !== 'pix') {
    const phoneDigits = String(payer.phone || '').replace(/\D/g, '');
    if (phoneDigits.length >= 10) {
      payerBody.phone = {
        area_code: phoneDigits.slice(0, 2),
        number: phoneDigits.slice(2),
      };
    }
  }

  const statementDescriptor = buildMercadoPagoStatementDescriptor(storeName);
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
      statement_descriptor: statementDescriptor,
    };
  }

  const items = buildMercadoPagoOrderItems(order, validated || {});
  const shipmentAddress = buildShipmentAddress(order?.endereco);

  const body = {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: total,
    external_reference: String(externalReference).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 150),
    description: String(storeName || 'Pedido online').trim().slice(0, 150) || 'Pedido online',
    payer: payerBody,
    items,
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

  // Endereço nativo da Orders API (additional_info da API /payments não é suportado aqui).
  if (shipmentAddress) {
    const address = Object.fromEntries(
      Object.entries(shipmentAddress).filter(([, value]) => value != null && value !== '')
    );
    if (Object.keys(address).length) {
      body.shipment = { address };
      if (method !== 'pix') {
        payerBody.address = { ...address };
      }
    }
  }

  // registration_date: a Orders API não expõe additional_info.payer; mantemos no metadata local.
  void registrationDate;

  const sessionId = String(deviceId || '').trim();
  return mpRequest('/v1/orders', {
    method: 'POST',
    accessToken,
    body,
    headers: {
      'X-Idempotency-Key': String(idempotencyKey),
      ...(sessionId ? { 'X-Meli-Session-Id': sessionId } : {}),
    },
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
