import { NextResponse } from 'next/server';
import { checkPublicOrderRateLimit } from '@/lib/rateLimit';
import {
  createCheckoutToken,
  hashCheckoutToken,
} from '@/lib/payments/crypto';
import {
  createMercadoPagoPayment,
  extractMercadoPagoPix,
  mapMercadoPagoStatus,
} from '@/lib/payments/providers/mercadoPago';
import {
  finalizeApprovedPayment,
  getUsableMercadoPagoAccount,
} from '@/lib/payments/paymentServer';
import { requirePaymentFeatureForEmpresa } from '@/lib/payments/paymentFeature';
import { preparePublicOrder } from '@/lib/orders/publicOrderServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function POST(request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || '').trim().toLowerCase();
  const method = body.method === 'pix' ? 'pix' : 'credit_card';
  const rateLimit = checkPublicOrderRateLimit(request, `${slug}:payment`);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Muitas tentativas. Aguarde e tente novamente.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
    );
  }

  let paymentRow = null;
  try {
    const prepared = await preparePublicOrder({
      supabase,
      slug,
      order: body.order,
      customer: body.customer,
    });
    await requirePaymentFeatureForEmpresa(supabase, prepared.empresa.id);
    const account = await getUsableMercadoPagoAccount(supabase, prepared.empresa.id);
    if (!account) {
      return NextResponse.json(
        { ok: false, error: 'Pagamento online indisponível para esta loja.' },
        { status: 409 }
      );
    }
    if (account.metodos?.[method] === false) {
      return NextResponse.json(
        { ok: false, error: 'Método de pagamento indisponível.' },
        { status: 409 }
      );
    }

    const sandboxAccount = account.metadata?.live_mode === false;
    const checkoutToken = createCheckoutToken();
    const { data: inserted, error: insertError } = await supabase
      .from('pagamentos')
      .insert({
        empresa_id: prepared.empresa.id,
        provider: 'mercado_pago',
        checkout_token_hash: hashCheckoutToken(checkoutToken),
        metodo: method,
        status: 'pendente',
        valor: prepared.validated.total,
        order_payload: {
          slug: prepared.slug,
          order: prepared.order,
          validated: prepared.validated,
        },
        customer_payload: prepared.customer,
        expires_at:
          method === 'pix' ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
      })
      .select('*')
      .single();
    if (insertError) throw insertError;
    paymentRow = inserted;

    let payerEmail = String(
      body.cardData?.payer?.email || body.email || prepared.customer.email || ''
    ).trim();
    // No sandbox o MP exige comprador @testuser.com; o e-mail do token do Brick
    // precisa ser o mesmo enviado na order (não reescrever para outro aleatório).
    if (sandboxAccount) {
      payerEmail = payerEmail.toLowerCase().endsWith('@testuser.com')
        ? payerEmail
        : 'test@testuser.com';
    }
    const cardData =
      body.cardData && payerEmail
        ? {
            ...body.cardData,
            payer: {
              ...(body.cardData.payer || {}),
              email: payerEmail,
            },
          }
        : body.cardData;

    const { data: empresaRow } = await supabase
      .from('empresas')
      .select('nome')
      .eq('id', prepared.empresa.id)
      .maybeSingle();
    const { data: existingCliente } = await supabase
      .from('clientes')
      .select('created_at')
      .eq('empresa_id', prepared.empresa.id)
      .eq('telefone', prepared.phone)
      .maybeSingle();

    const remote = await createMercadoPagoPayment({
      accessToken: account.accessToken,
      amount: prepared.validated.total,
      method,
      payer: {
        name: prepared.customer.name || prepared.order.clienteNome,
        email: payerEmail,
        phone: prepared.phone,
      },
      externalReference: paymentRow.id,
      idempotencyKey: paymentRow.idempotency_key,
      cardData,
      order: prepared.order,
      validated: prepared.validated,
      storeName: empresaRow?.nome || prepared.slug,
      registrationDate: existingCliente?.created_at || new Date().toISOString(),
      sandbox: sandboxAccount,
      deviceId: String(body.deviceId || body.cardData?.deviceId || '').trim() || null,
    });
    const pix = extractMercadoPagoPix(remote);
    const paymentTx = remote?.transactions?.payments?.[0];
    const status = mapMercadoPagoStatus(remote);
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('pagamentos')
      .update({
        provider_payment_id: String(remote.id),
        provider_status: remote.status || paymentTx?.status || null,
        status_detail: paymentTx?.status_detail || remote.status_detail || null,
        status,
        qr_code: pix.qrCode,
        qr_code_base64: pix.qrCodeBase64,
        ticket_url: pix.ticketUrl,
        approved_at:
          status === 'aprovado' ? remote.last_updated_date || now : null,
        updated_at: now,
      })
      .eq('id', paymentRow.id)
      .select('*')
      .single();
    if (updateError) throw updateError;

    const pedido = status === 'aprovado' ? await finalizeApprovedPayment(supabase, updated) : null;
    return NextResponse.json({
      ok: true,
      payment: {
        id: updated.id,
        token: checkoutToken,
        status: updated.status,
        statusDetail: updated.status_detail,
        providerOrderId: updated.provider_payment_id || null,
        qrCode: updated.qr_code,
        qrCodeBase64: updated.qr_code_base64,
        ticketUrl: updated.ticket_url,
        expiresAt: updated.expires_at,
      },
      order: pedido ? { id: pedido.id, codigo: pedido.codigo } : null,
    });
  } catch (error) {
    if (paymentRow?.id) {
      await supabase
        .from('pagamentos')
        .update({
          status: 'erro',
          status_detail: String(error?.message || 'Falha ao criar pagamento').slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRow.id);
    }
    return NextResponse.json(
      { ok: false, error: error?.message || 'Não foi possível iniciar o pagamento.' },
      { status: error?.status && error.status < 500 ? error.status : 500 }
    );
  }
}
