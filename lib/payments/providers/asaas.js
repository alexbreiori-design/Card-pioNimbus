const ASAAS_API_LIVE = 'https://api.asaas.com';
const ASAAS_API_SANDBOX = 'https://api-sandbox.asaas.com';

function asaasBaseUrl(sandbox = false) {
  return sandbox ? ASAAS_API_SANDBOX : ASAAS_API_LIVE;
}

async function asaasRequest(path, { method = 'GET', apiKey, body, sandbox = false } = {}) {
  const response = await fetch(`${asaasBaseUrl(sandbox)}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      access_token: String(apiKey || ''),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const firstError = Array.isArray(json?.errors) ? json.errors[0] : null;
    const message =
      firstError?.description ||
      json?.message ||
      json?.error ||
      `O Asaas recusou a solicitação (${response.status}).`;
    console.error('[asaas]', path, response.status, JSON.stringify(json).slice(0, 1500));
    const error = new Error(String(message).slice(0, 400));
    error.status = response.status >= 400 && response.status < 600 ? response.status : 502;
    error.details = json;
    throw error;
  }
  return json;
}

export function isAsaasSandboxApiKey(apiKey = '') {
  const value = String(apiKey || '');
  return value.includes('_hml_') || value.includes('hmlg') || /sandbox/i.test(value);
}

export async function validateAsaasApiKey(apiKey, { sandbox } = {}) {
  const useSandbox =
    typeof sandbox === 'boolean' ? sandbox : isAsaasSandboxApiKey(apiKey);
  const me = await asaasRequest('/v3/myAccount', { apiKey, sandbox: useSandbox });
  return { me, sandbox: useSandbox };
}

export async function findOrCreateAsaasCustomer({
  apiKey,
  sandbox = false,
  name,
  email,
  phone,
  cpfCnpj,
}) {
  const phoneDigits = String(phone || '').replace(/\D/g, '');
  const document = String(cpfCnpj || '').replace(/\D/g, '');
  if (!document) {
    throw Object.assign(new Error('Informe o CPF ou CNPJ do pagador.'), { status: 400 });
  }

  if (document) {
    const found = await asaasRequest(
      `/v3/customers?cpfCnpj=${encodeURIComponent(document)}&limit=1`,
      { apiKey, sandbox }
    );
    if (found?.data?.[0]?.id) return found.data[0];
  }
  if (email) {
    const found = await asaasRequest(
      `/v3/customers?email=${encodeURIComponent(email)}&limit=1`,
      { apiKey, sandbox }
    );
    const existing = found?.data?.[0];
    if (existing?.id) {
      const existingDoc = String(existing.cpfCnpj || '').replace(/\D/g, '');
      if (!existingDoc && document) {
        return asaasRequest(`/v3/customers/${encodeURIComponent(existing.id)}`, {
          method: 'PUT',
          apiKey,
          sandbox,
          body: {
            name: String(name || existing.name || 'Cliente').trim().slice(0, 100) || 'Cliente',
            email: String(email || existing.email || '').trim() || undefined,
            mobilePhone: phoneDigits || existing.mobilePhone || undefined,
            cpfCnpj: document,
            notificationDisabled: true,
          },
        });
      }
      return existing;
    }
  }

  return asaasRequest('/v3/customers', {
    method: 'POST',
    apiKey,
    sandbox,
    body: {
      name: String(name || 'Cliente').trim().slice(0, 100) || 'Cliente',
      email: String(email || '').trim() || undefined,
      mobilePhone: phoneDigits || undefined,
      cpfCnpj: document,
      notificationDisabled: true,
    },
  });
}

function dueDatePlusDays(days = 1) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function createAsaasPayment({
  apiKey,
  sandbox = false,
  customerId,
  amount,
  method,
  description,
  externalReference,
  creditCard = null,
  creditCardHolderInfo = null,
  remoteIp = null,
}) {
  const billingType = method === 'pix' ? 'PIX' : 'CREDIT_CARD';
  const body = {
    customer: customerId,
    billingType,
    value: Number(amount),
    dueDate: dueDatePlusDays(method === 'pix' ? 0 : 1),
    description: String(description || 'Pedido online').trim().slice(0, 500),
    externalReference: String(externalReference || '').slice(0, 100),
  };
  if (method === 'credit_card') {
    if (creditCard?.creditCardToken) {
      body.creditCardToken = creditCard.creditCardToken;
    } else if (creditCard) {
      body.creditCard = {
        holderName: creditCard.holderName,
        number: String(creditCard.number || '').replace(/\D/g, ''),
        expiryMonth: String(creditCard.expiryMonth || '').padStart(2, '0'),
        expiryYear: String(creditCard.expiryYear || ''),
        ccv: String(creditCard.ccv || creditCard.cvv || ''),
      };
      if (creditCardHolderInfo) {
        const phone = String(creditCardHolderInfo.phone || '').replace(/\D/g, '');
        body.creditCardHolderInfo = {
          name: String(creditCardHolderInfo.name || '').trim(),
          email: String(creditCardHolderInfo.email || '').trim(),
          cpfCnpj: String(creditCardHolderInfo.cpfCnpj || '').replace(/\D/g, ''),
          postalCode: String(creditCardHolderInfo.postalCode || '').replace(/\D/g, ''),
          addressNumber: String(creditCardHolderInfo.addressNumber || '').trim(),
          addressComplement: creditCardHolderInfo.addressComplement || undefined,
          phone: phone || undefined,
          mobilePhone: phone || undefined,
        };
      }
    }
    if (remoteIp) body.remoteIp = remoteIp;
  }
  return asaasRequest('/v3/payments', {
    method: 'POST',
    apiKey,
    sandbox,
    body,
  });
}

export async function getAsaasPixQrCode(apiKey, paymentId, { sandbox = false } = {}) {
  return asaasRequest(`/v3/payments/${encodeURIComponent(paymentId)}/pixQrCode`, {
    apiKey,
    sandbox,
  });
}

export async function getAsaasPayment(apiKey, paymentId, { sandbox = false } = {}) {
  return asaasRequest(`/v3/payments/${encodeURIComponent(paymentId)}`, {
    apiKey,
    sandbox,
  });
}

export async function deleteAsaasPayment(apiKey, paymentId, { sandbox = false } = {}) {
  return asaasRequest(`/v3/payments/${encodeURIComponent(paymentId)}`, {
    method: 'DELETE',
    apiKey,
    sandbox,
  });
}

export function mapAsaasStatus(payment) {
  const status = String(payment?.status || '').toUpperCase();
  if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status)) return 'aprovado';
  if (['PENDING', 'AWAITING_RISK_ANALYSIS'].includes(status)) return 'pendente';
  if (['AUTHORIZED'].includes(status)) return 'processando';
  if (['REFUNDED', 'REFUND_REQUESTED', 'REFUND_IN_PROGRESS', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE'].includes(status)) {
    return 'estornado';
  }
  if (['DELETED', 'REFUNDED'].includes(status)) return 'cancelado';
  if (status === 'OVERDUE') return 'expirado';
  if (['REFUSED', 'REPROVED_BY_RISK_ANALYSIS'].includes(status)) return 'recusado';
  return 'erro';
}

export function extractAsaasPix(qrPayload = {}) {
  return {
    qrCode: qrPayload?.payload || qrPayload?.pixCopiaECola || null,
    qrCodeBase64: qrPayload?.encodedImage || null,
    ticketUrl: null,
  };
}

export function verifyAsaasWebhook(request, expectedToken) {
  const secret = String(expectedToken || process.env.ASAAS_WEBHOOK_TOKEN || '').trim();
  if (!secret) return false;
  const header = request.headers.get('asaas-access-token') || '';
  return header === secret;
}

const ASAAS_PAYMENT_WEBHOOK_EVENTS = [
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_OVERDUE',
  'PAYMENT_DELETED',
  'PAYMENT_REFUNDED',
  'PAYMENT_REFUND_IN_PROGRESS',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
  'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
];

function getAsaasWebhookAuthToken() {
  return String(process.env.ASAAS_WEBHOOK_TOKEN || '').trim();
}

function getAsaasWebhookPublicUrl() {
  const origin = String(process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');
  if (!origin || /localhost|127\.0\.0\.1/i.test(origin)) return null;
  return `${origin}/api/pagamentos/webhook/asaas`;
}

export async function listAsaasWebhooks(apiKey, { sandbox = false } = {}) {
  const json = await asaasRequest('/v3/webhooks', { apiKey, sandbox });
  return Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
}

export async function createAsaasWebhook(apiKey, payload, { sandbox = false } = {}) {
  return asaasRequest('/v3/webhooks', {
    method: 'POST',
    apiKey,
    sandbox,
    body: payload,
  });
}

export async function updateAsaasWebhook(apiKey, webhookId, payload, { sandbox = false } = {}) {
  return asaasRequest(`/v3/webhooks/${encodeURIComponent(webhookId)}`, {
    method: 'PUT',
    apiKey,
    sandbox,
    body: payload,
  });
}

export async function deleteAsaasWebhook(apiKey, webhookId, { sandbox = false } = {}) {
  return asaasRequest(`/v3/webhooks/${encodeURIComponent(webhookId)}`, {
    method: 'DELETE',
    apiKey,
    sandbox,
  });
}

/**
 * Garante webhook de pagamentos na conta Asaas do lojista (sem configuração manual no painel).
 * Retorna null se não houver URL pública ou token de plataforma.
 */
export async function ensureAsaasPaymentWebhook(apiKey, { sandbox = false } = {}) {
  const url = getAsaasWebhookPublicUrl();
  const authToken = getAsaasWebhookAuthToken();
  if (!url) {
    return { ok: false, skipped: true, reason: 'missing_public_url' };
  }
  if (authToken.length < 32 || authToken.length > 255) {
    return { ok: false, skipped: true, reason: 'invalid_webhook_token' };
  }

  const payload = {
    name: 'Cardápio Nimbus — pagamentos',
    url,
    email: String(process.env.ASAAS_WEBHOOK_ALERT_EMAIL || '').trim() || undefined,
    enabled: true,
    interrupted: false,
    apiVersion: 3,
    authToken,
    sendType: 'SEQUENTIALLY',
    events: ASAAS_PAYMENT_WEBHOOK_EVENTS,
  };

  const existing = await listAsaasWebhooks(apiKey, { sandbox });
  const ours = existing.find(
    (hook) => String(hook?.url || '').replace(/\/$/, '') === url.replace(/\/$/, '')
  );
  if (ours?.id) {
    const updated = await updateAsaasWebhook(apiKey, ours.id, payload, { sandbox });
    return { ok: true, webhookId: updated?.id || ours.id, created: false };
  }

  const created = await createAsaasWebhook(apiKey, payload, { sandbox });
  return { ok: true, webhookId: created?.id || null, created: true };
}
