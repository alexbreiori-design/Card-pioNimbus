import { NextResponse } from 'next/server';
import { getEmpresaBySlug } from '@/lib/caixa/caixaServer';
import { normalizeSlug } from '@/lib/normalize';
import { mapDbPedidoToAdmin } from '@/lib/orders/mapAdminOrder';
import { isModelStoreSlug } from '@/lib/superAdmin/modelStore';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function PATCH(request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  try {
    await requireSuperAdmin();

    const body = await request.json();
    const slug = normalizeSlug(body.slug || '');
    if (!slug || !isModelStoreSlug(slug)) {
      return NextResponse.json(
        { ok: false, error: 'Recurso disponível apenas na loja modelo.' },
        { status: 403 }
      );
    }

    const entregarAte = body.entregarAte ? new Date(body.entregarAte) : null;
    if (!entregarAte || Number.isNaN(entregarAte.getTime())) {
      return NextResponse.json({ ok: false, error: 'Prazo inválido.' }, { status: 400 });
    }

    const dbId = body.dbId || null;
    const codigo = body.codigo ? String(body.codigo) : '';
    if (!dbId && !codigo) {
      return NextResponse.json({ ok: false, error: 'Pedido não identificado.' }, { status: 400 });
    }

    const empresa = await getEmpresaBySlug(supabase, slug);
    if (!empresa?.id) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const iso = entregarAte.toISOString();
    let query = supabase
      .from('pedidos')
      .update({ entregar_ate: iso, updated_at: new Date().toISOString() })
      .eq('empresa_id', empresa.id);

    if (dbId) query = query.eq('id', dbId);
    else query = query.eq('codigo', codigo);

    const { data, error } = await query.select('*').maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ ok: false, error: 'Pedido não encontrado.' }, { status: 404 });
    }

    const order = mapDbPedidoToAdmin(data, []);
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao ajustar prazo.' },
      { status }
    );
  }
}
