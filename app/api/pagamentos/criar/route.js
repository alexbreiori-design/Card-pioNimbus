import { NextResponse } from 'next/server';
import { checkPublicOrderRateLimit } from '@/lib/rateLimit';
import {
  createCheckoutToken,
  hashCheckoutToken,
} from '@/lib/payments/crypto';
import {
  createAsaasPayment,
  extractAsaasPix,
  findOrCreateAsaasCustomer,
  getAsaasPixQrCode,
  mapAsaasStatus,
} from '@/lib/payments/providers/asaas';
import {
  createMercadoPagoPayment,
  extractMercadoPagoPix,
  mapMercadoPagoStatus,
} from '@/lib/payments/providers/mercadoPago';
import {
  createPagBankPixOrder,
  extractPagBankPix,
  mapPagBankStatus,
} from '@/lib/payments/providers/pagbank';
import {
  finalizeApprovedPayment,
  getPaymentAccount,
  getUsableAsaasAccount,
  getUsableMercadoPagoAccount,
  getUsablePagBankAccount,
} from '@/lib/payments/paymentServer';
import { requirePaymentFeatureForEmpresa } from '@/lib/payments/paymentFeature';
import { preparePublicOrder } from '@/lib/orders/publicOrderServer';
import { getSiteOrigin } from '@/lib/siteUrl';
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
    const active = await getPaymentAccount(supabase, prepared.empresa.id);
    if (!active) {
      return NextResponse.json(
        { ok: false, error: 'Pagamento online indisponível para esta loja.' },
        { status: 409 }
      );
    }
    if (active.metodos?.[method] === false) {
      return NextResponse.json(
        { ok: false, error: 'Método de pagamento indisponível.' },
        { status: 409 }
      );
    }

    const provider = active.provider;
    const checkoutToken = createCheckoutToken();
    const { data: inserted, error: insertError } = await supabase
      .from('pagamentos')
      .insert({
        empresa_id: prepared.empresa.id,
        provider,
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

    let updated;
    let pedido = null;

    if (provider === 'pagbank') {
      if (method !== 'pix') {
        throw Object.assign(
          new Error('No momento, o PagBank está disponível apenas para Pix.'),
          { status: 400 }
        );
      }
      const account = await getUsablePagBankAccount(supabase, prepared.empresa.id);
      if (!account) {
        throw Object.assign(new Error('Conta PagBank desconectada.'), { status: 409 });
      }
      const payerEmail = String(
        body.email || body.cardData?.payer?.email || prepared.customer.email || ''
      ).trim();
      const payerDocument = String(
        body.cpfCnpj ||
          body.cardData?.payer?.identification?.number ||
          prepared.customer.cpf ||
          prepared.customer.cpfCnpj ||
          ''
      ).replace(/\D/g, '');
      if (!payerEmail) {
        throw Object.assign(new Error('Informe um e-mail válido para pagar com PagBank.'), {
          status: 400,
        });
      }
      if (!payerDocument) {
        throw Object.assign(new Error('Informe o CPF ou CNPJ para pagar com PagBank.'), {
          status: 400,
        });
      }
      const remote = await createPagBankPixOrder({
        accessToken: account.accessToken,
        amount: prepared.validated.total,
        payer: {
          name: prepared.customer.name || prepared.order.clienteNome,
          email: payerEmail,
          phone: prepared.phone,
          taxId: payerDocument,
        },
        order: prepared.order,
        externalReference: paymentRow.id,
        notificationUrl: `${getSiteOrigin()}/api/pagamentos/webhook/pagbank`,
        expirationDate: paymentRow.expires_at,
      });
      const pix = await extractPagBankPix(remote, account.accessToken);
      const charge = Array.isArray(remote?.charges) ? remote.charges[0] : null;
      const status = mapPagBankStatus(remote);
      const now = new Date().toISOString();
      const { data, error: updateError } = await supabase
        .from('pagamentos')
        .update({
          provider_payment_id: String(remote.id),
          provider_status: charge?.status || 'WAITING',
          status_detail: charge?.payment_response?.message || null,
          status,
          qr_code: pix.qrCode,
          qr_code_base64: pix.qrCodeBase64,
          ticket_url: pix.ticketUrl,
          approved_at: status === 'aprovado' ? charge?.paid_at || now : null,
          updated_at: now,
        })
        .eq('id', paymentRow.id)
        .select('*')
        .single();
      if (updateError) throw updateError;
      updated = data;
      pedido = status === 'aprovado' ? await finalizeApprovedPayment(supabase, updated) : null;
    } else if (provider === 'asaas') {
      const account = await getUsableAsaasAccount(supabase, prepared.empresa.id);
      if (!account) {
        throw Object.assign(new Error('Conta Asaas desconectada.'), { status: 409 });
      }
      const payerEmail = String(
        body.cardData?.payer?.email || body.email || prepared.customer.email || ''
      ).trim();
      const payerDocument = String(
        body.cardData?.payer?.identification?.number ||
          body.cardData?.identification?.number ||
          body.cardData?.creditCardHolderInfo?.cpfCnpj ||
          body.cpfCnpj ||
          prepared.customer.cpf ||
          prepared.customer.cpfCnpj ||
          ''
      ).replace(/\D/g, '');
      if (!payerDocument) {
        throw Object.assign(new Error('Informe o CPF ou CNPJ para pagar com Asaas.'), {
          status: 400,
        });
      }
      const customer = await findOrCreateAsaasCustomer({
        apiKey: account.accessToken,
        sandbox: account.sandbox,
        name: prepared.customer.name || prepared.order.clienteNome,
        email: payerEmail,
        phone: prepared.phone,
        cpfCnpj: payerDocument,
      });

      const creditCard = body.cardData?.creditCard || body.cardData?.card || null;
      const creditCardHolderInfo =
        body.cardData?.creditCardHolderInfo || body.cardData?.holderInfo || null;
      const remote = await createAsaasPayment({
        apiKey: account.accessToken,
        sandbox: account.sandbox,
        customerId: customer.id,
        amount: prepared.validated.total,
        method,
        description: `Pedido ${prepared.slug}`,
        externalReference: paymentRow.id,
        creditCard: method === 'credit_card' ? creditCard : null,
        creditCardHolderInfo: method === 'credit_card' ? creditCardHolderInfo : null,
        remoteIp:
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request.headers.get('x-real-ip') ||
          null,
      });

      let pix = { qrCode: null, qrCodeBase64: null, ticketUrl: null };
      if (method === 'pix') {
        const qr = await getAsaasPixQrCode(account.accessToken, remote.id, {
          sandbox: account.sandbox,
        });
        pix = extractAsaasPix(qr);
      }
      const status = mapAsaasStatus(remote);
      const now = new Date().toISOString();
      const { data, error: updateError } = await supabase
        .from('pagamentos')
        .update({
          provider_payment_id: String(remote.id),
          provider_status: remote.status || null,
          status_detail: remote.invoiceUrl || null,
          status,
          qr_code: pix.qrCode,
          qr_code_base64: pix.qrCodeBase64,
          ticket_url: pix.ticketUrl,
          approved_at: status === 'aprovado' ? remote.paymentDate || now : null,
          updated_at: now,
        })
        .eq('id', paymentRow.id)
        .select('*')
        .single();
      if (updateError) throw updateError;
      updated = data;
      pedido = status === 'aprovado' ? await finalizeApprovedPayment(supabase, updated) : null;
    } else if (provider === 'mercado_pago') {
      const account = await getUsableMercadoPagoAccount(supabase, prepared.empresa.id);
      if (!account) {
        throw Object.assign(new Error('Conta Mercado Pago desconectada.'), { status: 409 });
      }
      const sandboxAccount = account.metadata?.live_mode === false;
      let payerEmail = String(
        body.cardData?.payer?.email || body.email || prepared.customer.email || ''
      ).trim();
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
      const { data, error: updateError } = await supabase
        .from('pagamentos')
        .update({
          provider_payment_id: String(remote.id),
          provider_status: remote.status || paymentTx?.status || null,
          status_detail: paymentTx?.status_detail || remote.status_detail || null,
          status,
          qr_code: pix.qrCode,
          qr_code_base64: pix.qrCodeBase64,
          ticket_url: pix.ticketUrl,
          approved_at: status === 'aprovado' ? remote.last_updated_date || now : null,
          updated_at: now,
        })
        .eq('id', paymentRow.id)
        .select('*')
        .single();
      if (updateError) throw updateError;
      updated = data;
      pedido = status === 'aprovado' ? await finalizeApprovedPayment(supabase, updated) : null;
    } else {
      throw Object.assign(new Error('Provedor de pagamento não suportado.'), { status: 400 });
    }

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
