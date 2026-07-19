import { decryptSecret, encryptSecret } from '@/lib/payments/crypto';
import {
  cancelMercadoPagoOrder,
  extractMercadoPagoPix,
  getMercadoPagoPayment,
  mapMercadoPagoStatus,
  refreshMercadoPagoToken,
} from '@/lib/payments/providers/mercadoPago';
import {
  deleteAsaasPayment,
  deleteAsaasWebhook,
  ensureAsaasPaymentWebhook,
  extractAsaasPix,
  getAsaasPayment,
  getAsaasPixQrCode,
  isAsaasSandboxApiKey,
  mapAsaasStatus,
} from '@/lib/payments/providers/asaas';

export async function getPaymentAccount(supabase, empresaId, provider = null) {
  let query = supabase
    .from('empresa_pagamento_contas')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo');
  if (provider) query = query.eq('provider', provider);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function getUsableMercadoPagoAccount(supabase, empresaId) {
  const account = await getPaymentAccount(supabase, empresaId, 'mercado_pago');
  if (!account) return null;
  let accessToken = decryptSecret(account.access_token_ciphertext);
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  if (expiresAt && expiresAt <= Date.now() + 5 * 60 * 1000 && account.refresh_token_ciphertext) {
    const refreshStartedAt = new Date().toISOString();
    const staleBefore = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: claimed, error: claimError } = await supabase
      .from('empresa_pagamento_contas')
      .update({ token_refresh_started_at: refreshStartedAt, updated_at: refreshStartedAt })
      .eq('id', account.id)
      .or(`token_refresh_started_at.is.null,token_refresh_started_at.lt.${staleBefore}`)
      .select('id')
      .maybeSingle();
    if (claimError) throw claimError;

    if (!claimed) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const latest = await getPaymentAccount(supabase, empresaId, 'mercado_pago');
      return { ...latest, accessToken: decryptSecret(latest.access_token_ciphertext) };
    }

    try {
      const refreshed = await refreshMercadoPagoToken(
        decryptSecret(account.refresh_token_ciphertext)
      );
      accessToken = refreshed.access_token;
      const patch = {
        access_token_ciphertext: encryptSecret(refreshed.access_token),
        refresh_token_ciphertext: refreshed.refresh_token
          ? encryptSecret(refreshed.refresh_token)
          : account.refresh_token_ciphertext,
        public_key: refreshed.public_key || account.public_key,
        token_expires_at: refreshed.expires_in
          ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString()
          : null,
        token_refresh_started_at: null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('empresa_pagamento_contas')
        .update(patch)
        .eq('id', account.id);
      if (error) throw error;
      Object.assign(account, patch);
    } catch (error) {
      await supabase
        .from('empresa_pagamento_contas')
        .update({ token_refresh_started_at: null, updated_at: new Date().toISOString() })
        .eq('id', account.id);
      throw error;
    }
  }
  return { ...account, accessToken };
}

export async function saveMercadoPagoAccount(supabase, empresaId, tokenData) {
  const now = new Date().toISOString();
  const accessToken = String(tokenData.access_token || '');
  const publicKey = String(tokenData.public_key || '');
  const existing = await getPaymentAccount(supabase, empresaId);
  if (existing && existing.provider !== 'mercado_pago') {
    throw Object.assign(new Error('Desconecte o provedor atual antes de conectar outro.'), {
      status: 409,
    });
  }
  // Credenciais de teste do painel usam APP_USR-; o flag sandbox/live_mode do caller manda.
  const liveMode = !(
    tokenData.live_mode === false ||
    tokenData.sandbox === true ||
    publicKey.startsWith('TEST-') ||
    accessToken.startsWith('TEST-')
  );
  const { data, error } = await supabase
    .from('empresa_pagamento_contas')
    .upsert(
      {
        empresa_id: empresaId,
        provider: 'mercado_pago',
        status: 'ativo',
        access_token_ciphertext: encryptSecret(tokenData.access_token),
        refresh_token_ciphertext: tokenData.refresh_token
          ? encryptSecret(tokenData.refresh_token)
          : null,
        public_key: tokenData.public_key || null,
        provider_user_id: tokenData.user_id ? String(tokenData.user_id) : null,
        token_expires_at: tokenData.expires_in
          ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString()
          : null,
        metadata: {
          live_mode: liveMode,
          connection_mode: tokenData.connection_mode || 'oauth',
          token_kind: accessToken.startsWith('APP_USR-')
            ? 'app_usr'
            : accessToken.startsWith('TEST-')
              ? 'test'
              : 'unknown',
          api: 'orders',
          scope: tokenData.scope || null,
        },
        connected_at: now,
        disconnected_at: null,
        updated_at: now,
      },
      { onConflict: 'empresa_id,provider' }
    )
    .select('id, provider, status, public_key, provider_user_id, metodos, metadata, connected_at')
    .single();
  if (error) throw error;
  return data;
}

export async function getUsableAsaasAccount(supabase, empresaId) {
  const account = await getPaymentAccount(supabase, empresaId, 'asaas');
  if (!account) return null;
  const accessToken = decryptSecret(account.access_token_ciphertext);
  const sandbox =
    account.metadata?.live_mode === false || isAsaasSandboxApiKey(accessToken);
  return { ...account, accessToken, sandbox };
}

export async function saveAsaasAccount(supabase, empresaId, tokenData) {
  const now = new Date().toISOString();
  const apiKey = String(tokenData.access_token || tokenData.apiKey || '');
  const liveMode = !(
    tokenData.live_mode === false ||
    tokenData.sandbox === true ||
    isAsaasSandboxApiKey(apiKey)
  );
  const existing = await getPaymentAccount(supabase, empresaId);
  if (existing && existing.provider !== 'asaas') {
    throw Object.assign(new Error('Desconecte o provedor atual antes de conectar outro.'), {
      status: 409,
    });
  }

  let webhookMeta = {};
  try {
    const webhook = await ensureAsaasPaymentWebhook(apiKey, { sandbox: !liveMode });
    if (webhook?.ok && webhook.webhookId) {
      webhookMeta = {
        webhook_id: webhook.webhookId,
        webhook_auto: true,
        webhook_synced_at: now,
      };
    } else if (webhook?.skipped) {
      webhookMeta = {
        webhook_auto: false,
        webhook_skip_reason: webhook.reason,
      };
      console.warn('[asaas] webhook auto-skip', webhook.reason);
    }
  } catch (error) {
    // Conexão não deve falhar se o webhook automático não puder ser criado.
    webhookMeta = {
      webhook_auto: false,
      webhook_error: String(error?.message || 'falha ao registrar webhook').slice(0, 200),
    };
    console.error('[asaas] webhook auto-register failed', error?.message || error);
  }

  const { data, error } = await supabase
    .from('empresa_pagamento_contas')
    .upsert(
      {
        empresa_id: empresaId,
        provider: 'asaas',
        status: 'ativo',
        access_token_ciphertext: encryptSecret(apiKey),
        refresh_token_ciphertext: null,
        public_key: null,
        provider_user_id: tokenData.user_id ? String(tokenData.user_id) : null,
        token_expires_at: null,
        metadata: {
          live_mode: liveMode,
          connection_mode: 'api_key',
          wallet_id: tokenData.wallet_id || null,
          account_name: tokenData.account_name || null,
          ...webhookMeta,
        },
        connected_at: now,
        disconnected_at: null,
        updated_at: now,
      },
      { onConflict: 'empresa_id,provider' }
    )
    .select('id, provider, status, public_key, provider_user_id, metodos, metadata, connected_at')
    .single();
  if (error) throw error;
  return data;
}

export async function disconnectPaymentAccount(supabase, empresaId, provider) {
  if (provider === 'asaas') {
    try {
      const account = await getPaymentAccount(supabase, empresaId, 'asaas');
      const webhookId = account?.metadata?.webhook_id;
      if (account && webhookId) {
        const accessToken = decryptSecret(account.access_token_ciphertext);
        const sandbox =
          account.metadata?.live_mode === false || isAsaasSandboxApiKey(accessToken);
        await deleteAsaasWebhook(accessToken, webhookId, { sandbox });
      }
    } catch (error) {
      console.warn('[asaas] webhook cleanup on disconnect failed', error?.message || error);
    }
  }
  const { error } = await supabase
    .from('empresa_pagamento_contas')
    .update({
      status: 'desconectado',
      access_token_ciphertext: null,
      refresh_token_ciphertext: null,
      public_key: null,
      disconnected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('empresa_id', empresaId)
    .eq('provider', provider);
  if (error) throw error;
}

/** Webhook mp-connect: vinculação/desvinculação OAuth. */
export async function handleMercadoPagoConnectWebhook(supabase, { action, userId }) {
  const providerUserId = String(userId || '').trim();
  if (!providerUserId) return { handled: false };

  if (action === 'application.deauthorized') {
    const { data: rows, error: findError } = await supabase
      .from('empresa_pagamento_contas')
      .select('id, metadata')
      .eq('provider', 'mercado_pago')
      .eq('provider_user_id', providerUserId)
      .eq('status', 'ativo');
    if (findError) throw findError;

    for (const row of rows || []) {
      const { error } = await supabase
        .from('empresa_pagamento_contas')
        .update({
          status: 'desconectado',
          access_token_ciphertext: null,
          refresh_token_ciphertext: null,
          public_key: null,
          disconnected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            ...(row.metadata || {}),
            disconnected_via: 'mp-connect',
            last_mp_connect_action: action,
            last_mp_connect_at: new Date().toISOString(),
          },
        })
        .eq('id', row.id);
      if (error) throw error;
    }
    return { handled: true, disconnected: rows?.length || 0 };
  }

  // application.authorized: tokens já são gravados no callback OAuth.
  if (action === 'application.authorized') {
    return { handled: true, authorized: true };
  }

  return { handled: false };
}

export async function finalizeApprovedPayment(supabase, payment) {
  if (!payment || payment.status !== 'aprovado') return null;
  let pedidoId = payment.pedido_id;
  // Trigger no banco cria o pedido no UPDATE para aprovado; reconsulta se o RETURNING veio sem id.
  if (!pedidoId) {
    const { data: refreshed, error: refreshError } = await supabase
      .from('pagamentos')
      .select('pedido_id')
      .eq('id', payment.id)
      .maybeSingle();
    if (refreshError) throw refreshError;
    pedidoId = refreshed?.pedido_id || null;
  }
  if (!pedidoId) {
    throw new Error('Pagamento aprovado sem pedido finalizado.');
  }
  const { data: pedido, error } = await supabase
    .from('pedidos')
    .select('id, codigo')
    .eq('id', pedidoId)
    .single();
  if (error) throw error;
  return pedido;
}

export async function cancelPendingMercadoPagoPayment(supabase, paymentRow) {
  if (!paymentRow || !['pendente', 'processando'].includes(paymentRow.status)) {
    return paymentRow;
  }
  const account = await getUsableMercadoPagoAccount(supabase, paymentRow.empresa_id);
  if (!account) throw new Error('Conta Mercado Pago desconectada.');

  if (paymentRow.provider_payment_id) {
    try {
      await cancelMercadoPagoOrder(
        account.accessToken,
        paymentRow.provider_payment_id,
        `cancel-${paymentRow.id}`
      );
    } catch (error) {
      // Já cancelado/expirado no MP: seguimos marcando localmente.
      if (error?.status !== 409) throw error;
    }
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('pagamentos')
    .update({
      status: 'cancelado',
      status_detail: 'canceled_by_customer',
      provider_status: 'canceled',
      updated_at: now,
    })
    .eq('id', paymentRow.id)
    .select('*')
    .single();
  if (error) throw error;
  return updated;
}

export async function syncMercadoPagoPayment(supabase, paymentRow) {
  const account = await getUsableMercadoPagoAccount(supabase, paymentRow.empresa_id);
  if (!account) throw new Error('Conta Mercado Pago desconectada.');
  const remote = await getMercadoPagoPayment(account.accessToken, paymentRow.provider_payment_id);
  const pix = extractMercadoPagoPix(remote);
  const paymentTx = remote?.transactions?.payments?.[0];
  const status = mapMercadoPagoStatus(remote);
  const now = new Date().toISOString();
  const patch = {
    status,
    provider_status: remote.status || paymentTx?.status || null,
    status_detail: paymentTx?.status_detail || remote.status_detail || null,
    qr_code: pix.qrCode,
    qr_code_base64: pix.qrCodeBase64,
    ticket_url: pix.ticketUrl,
    approved_at:
      status === 'aprovado'
        ? remote.last_updated_date || remote.date_approved || now
        : paymentRow.approved_at,
    updated_at: now,
  };
  const { data: updated, error } = await supabase
    .from('pagamentos')
    .update(patch)
    .eq('id', paymentRow.id)
    .select('*')
    .single();
  if (error) throw error;
  if (updated.pedido_id) {
    const { error: orderError } = await supabase
      .from('pedidos')
      .update({ pagamento_status: status, updated_at: now })
      .eq('id', updated.pedido_id)
      .eq('pagamento_id', updated.id);
    if (orderError) throw orderError;
  }
  const pedido = status === 'aprovado' ? await finalizeApprovedPayment(supabase, updated) : null;
  return { payment: updated, pedido, remote };
}

export async function cancelPendingAsaasPayment(supabase, paymentRow) {
  if (!paymentRow || !['pendente', 'processando'].includes(paymentRow.status)) {
    return paymentRow;
  }
  const account = await getUsableAsaasAccount(supabase, paymentRow.empresa_id);
  if (!account) throw new Error('Conta Asaas desconectada.');

  if (paymentRow.provider_payment_id) {
    try {
      await deleteAsaasPayment(account.accessToken, paymentRow.provider_payment_id, {
        sandbox: account.sandbox,
      });
    } catch (error) {
      if (error?.status !== 400 && error?.status !== 404) throw error;
    }
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('pagamentos')
    .update({
      status: 'cancelado',
      status_detail: 'canceled_by_customer',
      provider_status: 'DELETED',
      updated_at: now,
    })
    .eq('id', paymentRow.id)
    .select('*')
    .single();
  if (error) throw error;
  return updated;
}

export async function syncAsaasPayment(supabase, paymentRow) {
  const account = await getUsableAsaasAccount(supabase, paymentRow.empresa_id);
  if (!account) throw new Error('Conta Asaas desconectada.');
  const remote = await getAsaasPayment(account.accessToken, paymentRow.provider_payment_id, {
    sandbox: account.sandbox,
  });
  let pix = {
    qrCode: paymentRow.qr_code,
    qrCodeBase64: paymentRow.qr_code_base64,
    ticketUrl: paymentRow.ticket_url,
  };
  if (paymentRow.metodo === 'pix' && !pix.qrCode) {
    try {
      const qr = await getAsaasPixQrCode(account.accessToken, paymentRow.provider_payment_id, {
        sandbox: account.sandbox,
      });
      pix = extractAsaasPix(qr);
    } catch {
      // Mantém QR já salvo.
    }
  }
  const status = mapAsaasStatus(remote);
  const now = new Date().toISOString();
  const patch = {
    status,
    provider_status: remote.status || null,
    status_detail: remote.transactionReceiptUrl || remote.invoiceUrl || null,
    qr_code: pix.qrCode,
    qr_code_base64: pix.qrCodeBase64,
    ticket_url: pix.ticketUrl,
    approved_at:
      status === 'aprovado' ? remote.paymentDate || remote.confirmedDate || now : paymentRow.approved_at,
    updated_at: now,
  };
  const { data: updated, error } = await supabase
    .from('pagamentos')
    .update(patch)
    .eq('id', paymentRow.id)
    .select('*')
    .single();
  if (error) throw error;
  if (updated.pedido_id) {
    const { error: orderError } = await supabase
      .from('pedidos')
      .update({ pagamento_status: status, updated_at: now })
      .eq('id', updated.pedido_id)
      .eq('pagamento_id', updated.id);
    if (orderError) throw orderError;
  }
  const pedido = status === 'aprovado' ? await finalizeApprovedPayment(supabase, updated) : null;
  return { payment: updated, pedido, remote };
}
