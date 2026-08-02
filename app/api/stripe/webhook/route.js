import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import {
  appendAssinaturaEvent,
  appendTimelineEvent,
  findEmpresaIdByStripeCustomer,
  findEmpresaIdBySubscription,
  upsertAssinaturaFromSubscription,
} from '@/lib/stripe/assinaturas';

function pickId(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id || null;
}

async function resolveEmpresaId(supabase, { metadataEmpresaId, clientReferenceId, customerId, subscriptionId }) {
  if (metadataEmpresaId) return metadataEmpresaId;
  if (clientReferenceId) return clientReferenceId;
  if (subscriptionId) {
    const bySubscription = await findEmpresaIdBySubscription(supabase, subscriptionId);
    if (bySubscription) return bySubscription;
  }
  if (customerId) {
    const byCustomer = await findEmpresaIdByStripeCustomer(supabase, customerId);
    if (byCustomer) return byCustomer;
  }
  return null;
}

function formatCurrency(cents, currency = 'BRL') {
  const value = Number(cents || 0) / 100;
  try {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: String(currency || 'BRL').toUpperCase() });
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

export async function POST(request) {
  const stripe = getStripe();
  const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ ok: false, error: 'Stripe webhook não configurado.' }, { status: 503 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('[stripe-webhook] assinatura inválida:', error?.message || error);
    return NextResponse.json({ ok: false, error: 'Assinatura inválida.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const subscriptionId = pickId(session.subscription);
        if (session.mode !== 'subscription' || !subscriptionId) break;

        const empresaId = await resolveEmpresaId(supabase, {
          metadataEmpresaId: session.metadata?.empresa_id,
          clientReferenceId: session.client_reference_id,
          customerId: pickId(session.customer),
          subscriptionId,
        });
        if (!empresaId) {
          console.warn('[stripe-webhook] checkout.session.completed sem empresa_id resolvível.');
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertAssinaturaFromSubscription(supabase, {
          empresaId,
          subscription,
          extra: {
            stripe_customer_id: pickId(session.customer),
            plano_codigo: session.metadata?.plano_codigo || subscription.metadata?.plano_codigo || null,
          },
        });
        await appendAssinaturaEvent(supabase, {
          empresaId,
          tipo: 'checkout_completo',
          resumo: 'Checkout de assinatura concluído.',
          payload: { session_id: session.id, subscription_id: subscriptionId },
        });
        await appendTimelineEvent(supabase, {
          empresaId,
          tipo: 'assinatura_iniciada',
          titulo: 'Assinatura Nimbus iniciada',
          detalhe: 'Checkout do Stripe concluído com sucesso.',
        });
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const empresaId = await resolveEmpresaId(supabase, {
          metadataEmpresaId: subscription.metadata?.empresa_id,
          customerId: pickId(subscription.customer),
          subscriptionId: subscription.id,
        });
        if (!empresaId) {
          console.warn(`[stripe-webhook] ${event.type} sem empresa_id resolvível.`);
          break;
        }

        await upsertAssinaturaFromSubscription(supabase, { empresaId, subscription });
        await appendAssinaturaEvent(supabase, {
          empresaId,
          tipo: 'subscription_sync',
          resumo: `Assinatura ${subscription.status}.`,
          payload: { subscription_id: subscription.id, status: subscription.status },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const empresaId = await resolveEmpresaId(supabase, {
          metadataEmpresaId: subscription.metadata?.empresa_id,
          customerId: pickId(subscription.customer),
          subscriptionId: subscription.id,
        });
        if (!empresaId) break;

        await upsertAssinaturaFromSubscription(supabase, { empresaId, subscription });
        await appendAssinaturaEvent(supabase, {
          empresaId,
          tipo: 'subscription_cancelada',
          resumo: 'Assinatura cancelada no Stripe.',
          payload: { subscription_id: subscription.id },
        });
        await appendTimelineEvent(supabase, {
          empresaId,
          tipo: 'assinatura_cancelada',
          titulo: 'Assinatura Nimbus cancelada',
          detalhe: 'Cancelamento confirmado pelo Stripe.',
        });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscriptionId = pickId(invoice.subscription);
        const empresaId = await resolveEmpresaId(supabase, {
          metadataEmpresaId: invoice.metadata?.empresa_id,
          customerId: pickId(invoice.customer),
          subscriptionId,
        });
        if (!empresaId) break;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertAssinaturaFromSubscription(supabase, {
            empresaId,
            subscription,
            extra: { ultimo_pagamento_em: new Date().toISOString() },
          });
        }
        await appendAssinaturaEvent(supabase, {
          empresaId,
          tipo: 'pagamento_confirmado',
          resumo: `Fatura paga · ${formatCurrency(invoice.amount_paid, invoice.currency)}`,
          payload: { invoice_id: invoice.id, amount_paid: invoice.amount_paid },
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = pickId(invoice.subscription);
        const empresaId = await resolveEmpresaId(supabase, {
          metadataEmpresaId: invoice.metadata?.empresa_id,
          customerId: pickId(invoice.customer),
          subscriptionId,
        });
        if (!empresaId) break;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertAssinaturaFromSubscription(supabase, { empresaId, subscription });
        }
        await appendAssinaturaEvent(supabase, {
          empresaId,
          tipo: 'pagamento_falhou',
          resumo: 'Falha na cobrança da assinatura.',
          payload: { invoice_id: invoice.id },
        });
        await appendTimelineEvent(supabase, {
          empresaId,
          tipo: 'assinatura_pagamento_falhou',
          titulo: 'Pagamento da assinatura falhou',
          detalhe: 'O Stripe não conseguiu cobrar a fatura. Verifique o método de pagamento do lojista.',
        });
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[stripe-webhook] erro ao processar evento', event?.type, error?.message || error);
    return NextResponse.json({ ok: false, error: 'Erro ao processar evento.' }, { status: 500 });
  }
}
