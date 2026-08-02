import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/normalize';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { mapAssinaturaRow } from '@/lib/stripe/assinaturas';
import { applyCarencia, salvarAcoesBilling } from '@/lib/stripe/carencia';
import { listConfiguredPlans } from '@/lib/stripe/plans';
import { loadAssinaturaRow, resolveEmpresaForBilling } from '@/lib/superAdmin/billing';

export async function GET(_request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    return NextResponse.json({ ok: false, error: 'Slug inválido.' }, { status: 400 });
  }

  try {
    await requireSuperAdmin();

    const empresa = await resolveEmpresaForBilling(supabase, safeSlug);
    if (!empresa) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const row = await loadAssinaturaRow(supabase, empresa.id);
    return NextResponse.json({
      ok: true,
      assinatura: mapAssinaturaRow(row),
      plans: listConfiguredPlans(),
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar assinatura.' },
      { status }
    );
  }
}

export async function PATCH(request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    return NextResponse.json({ ok: false, error: 'Slug inválido.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || '').trim();

  const isSalvarAcoes =
    action === 'salvar_acoes' || body.salvar_acoes === true || body.salvarAcoes === true;
  const wantsCarencia =
    body.status_local === 'cortesia' ||
    body.carencia === true ||
    action === 'ativar_carencia';
  const clearCarencia =
    body.status_local === null ||
    body.carencia === false ||
    action === 'remover_carencia';

  if (!isSalvarAcoes && !wantsCarencia && !clearCarencia && body.status_local === undefined) {
    return NextResponse.json({ ok: false, error: 'Nenhuma alteração informada.' }, { status: 400 });
  }

  try {
    const admin = await requireSuperAdmin();

    const empresa = await resolveEmpresaForBilling(supabase, safeSlug);
    if (!empresa) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    if (isSalvarAcoes) {
      const carenciaPayload = body.carencia && typeof body.carencia === 'object' ? body.carencia : {};
      const result = await salvarAcoesBilling(supabase, {
        empresa,
        admin,
        planoCodigo: body.planoCodigo || body.plano_codigo || carenciaPayload.planoCodigo,
        carenciaEnabled: Boolean(
          body.carenciaEnabled ?? body.carencia_enabled ?? carenciaPayload.enabled
        ),
        carenciaModo: body.carenciaModo || body.carencia_modo || carenciaPayload.modo,
        carenciaInicio:
          body.carencia_inicio ||
          body.carenciaInicio ||
          carenciaPayload.inicio ||
          carenciaPayload.carencia_inicio,
        carenciaFim:
          body.carencia_fim ||
          body.carenciaFim ||
          carenciaPayload.fim ||
          carenciaPayload.carencia_fim,
      });

      return NextResponse.json({
        ok: true,
        assinatura: mapAssinaturaRow(result.row),
        stripeMode: result.stripeMode,
        carencia: result.carencia || null,
        plan: result.plan
          ? {
              codigo: result.plan.codigo,
              label: result.plan.label,
              valorCentavos: result.plan.valorCentavos,
            }
          : null,
      });
    }

    if (clearCarencia && !wantsCarencia) {
      const result = await applyCarencia(supabase, {
        empresa,
        admin,
        clear: true,
      });
      return NextResponse.json({
        ok: true,
        assinatura: mapAssinaturaRow(result.row),
        checkoutUrl: null,
        stripeMode: result.stripeMode,
      });
    }

    const result = await applyCarencia(supabase, {
      empresa,
      admin,
      carenciaInicio: body.carencia_inicio || body.carenciaInicio,
      carenciaFim: body.carencia_fim || body.carenciaFim,
      planoCodigo: body.planoCodigo || body.plano_codigo,
      createCheckout: Boolean(body.createCheckout),
      clear: false,
    });

    return NextResponse.json({
      ok: true,
      assinatura: mapAssinaturaRow(result.row),
      checkoutUrl: result.checkoutUrl,
      stripeMode: result.stripeMode,
      plan: result.plan
        ? {
            codigo: result.plan.codigo,
            label: result.plan.label,
            valorCentavos: result.plan.valorCentavos,
          }
        : null,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao atualizar assinatura.' },
      { status }
    );
  }
}
