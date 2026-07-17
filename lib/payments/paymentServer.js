import { decryptSecret, encryptSecret } from '@/lib/payments/crypto';
import {
  extractMercadoPagoPix,
  getMercadoPagoPayment,
  mapMercadoPagoStatus,
  refreshMercadoPagoToken,
} from '@/lib/payments/providers/mercadoPago';

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
  const liveMode =
    tokenData.live_mode === false || accessToken.startsWith('TEST-') || publicKey.startsWith('TEST-')
      ? false
      : true;
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
          token_kind: accessToken.startsWith('TEST-')
            ? 'test'
            : accessToken.startsWith('APP_USR-')
              ? 'production'
              : 'unknown',
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

export async function disconnectPaymentAccount(supabase, empresaId, provider) {
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

export async function finalizeApprovedPayment(supabase, payment) {
  if (!payment || payment.status !== 'aprovado') return null;
  if (!payment.pedido_id) {
    throw new Error('Pagamento aprovado sem pedido finalizado.');
  }
  const { data: pedido, error } = await supabase
    .from('pedidos')
    .select('id, codigo')
    .eq('id', payment.pedido_id)
    .single();
  if (error) throw error;
  return pedido;
}

export async function syncMercadoPagoPayment(supabase, paymentRow) {
  const account = await getUsableMercadoPagoAccount(supabase, paymentRow.empresa_id);
  if (!account) throw new Error('Conta Mercado Pago desconectada.');
  const remote = await getMercadoPagoPayment(account.accessToken, paymentRow.provider_payment_id);
  const pix = extractMercadoPagoPix(remote);
  const status = mapMercadoPagoStatus(remote.status);
  const now = new Date().toISOString();
  const patch = {
    status,
    provider_status: remote.status || null,
    status_detail: remote.status_detail || null,
    qr_code: pix.qrCode,
    qr_code_base64: pix.qrCodeBase64,
    ticket_url: pix.ticketUrl,
    approved_at: status === 'aprovado' ? remote.date_approved || now : paymentRow.approved_at,
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
